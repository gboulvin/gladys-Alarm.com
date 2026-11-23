# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post: this integration arms and disarms a real alarm system.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove passwords, cookies, codes, account names and
  addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## How the integration handles your account

- The Alarm.com username and password are stored by Gladys in the integration
  configuration; the password is a `secret` field, never sent back to the
  browser. The integration never writes them to the logs.
- After a two-factor login, Alarm.com issues a "trusted device" cookie. It is
  stored in the integration configuration (internal key, not shown in the UI)
  so restarts do not ask for a new code. Remove the "Gladys Assistant" trusted
  device on Alarm.com to revoke it.
- The integration only talks to `https://www.alarm.com`, over TLS. It opens no
  port and serves nothing on the network.
- The container runs as an unprivileged user on a read-only file system
  (Gladys sandbox), with `/data` as the only writable location.
- Dashboard widgets can be seen by anyone in front of a dashboard. The alarm
  panel widget therefore never offers to disarm unless the administrator
  enables **Allow disarming from the dashboard**, and the disarm button asks
  for confirmation. The setting is checked again when the button is tapped.
- Use a dedicated Alarm.com login for Gladys, with only the permissions it
  needs: it can be revoked without touching your own account.

## Scope

In scope: the code of this repository and the Docker image it publishes.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
Alarm.com, its apps and the alarm hardware.
