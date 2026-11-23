// -----------------------------------------------------------------------------
// Minimal cookie jar for the Alarm.com web session. Every request goes to
// www.alarm.com, so a single flat name -> value map is enough: no domain or
// path matching. Cookies deleted by the server (empty value or an expiry in
// the past) are dropped.
// -----------------------------------------------------------------------------

export class CookieJar {
  constructor(initial = {}) {
    this.cookies = new Map(Object.entries(initial).filter(([, value]) => value));
  }

  /** Store the cookies of a fetch Response. */
  storeFrom(response) {
    const headers = response.headers;
    const lines =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : [headers.get('set-cookie')].filter(Boolean);
    for (const line of lines) {
      this.storeLine(line);
    }
  }

  /** Parse one `Set-Cookie` header line. */
  storeLine(line) {
    const [pair, ...attributes] = line.split(';');
    const separator = pair.indexOf('=');
    if (separator <= 0) {
      return;
    }
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    const expired = attributes.some((attribute) => {
      const [key, attrValue = ''] = attribute.split('=').map((part) => part.trim());
      if (key.toLowerCase() === 'max-age') {
        return Number(attrValue) <= 0;
      }
      if (key.toLowerCase() === 'expires') {
        const date = Date.parse(attrValue);
        return Number.isFinite(date) && date < Date.now();
      }
      return false;
    });
    if (!value || expired) {
      this.cookies.delete(name);
    } else {
      this.cookies.set(name, value);
    }
  }

  get(name) {
    return this.cookies.get(name);
  }

  set(name, value) {
    if (value) {
      this.cookies.set(name, value);
    } else {
      this.cookies.delete(name);
    }
  }

  /** Keep only the cookies whose name is listed (used to drop a dead session). */
  retain(names) {
    for (const name of [...this.cookies.keys()]) {
      if (!names.includes(name)) {
        this.cookies.delete(name);
      }
    }
  }

  /** Value of the `Cookie` request header. */
  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }
}
