// -----------------------------------------------------------------------------
// User-facing texts, in the four languages of the Gladys UI (English, French,
// German, Spanish). Gladys picks the user's language from these
// multi-language objects, English being the fallback.
//
// `{name}` placeholders are replaced by `t(key, { name: ... })`.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

export const TEXTS = {
  // Partition arming states.
  state_disarmed: { en: 'Disarmed', fr: 'Désarmée', de: 'Unscharf', es: 'Desarmada' },
  state_armed_stay: {
    en: 'Armed stay',
    fr: 'Armée (présence)',
    de: 'Intern scharf',
    es: 'Armada en casa',
  },
  state_armed_away: {
    en: 'Armed away',
    fr: 'Armée (absence)',
    de: 'Extern scharf',
    es: 'Armada ausente',
  },
  state_armed_night: {
    en: 'Armed night',
    fr: 'Armée (nuit)',
    de: 'Nacht scharf',
    es: 'Armada noche',
  },
  state_unknown: { en: 'Unknown', fr: 'Inconnu', de: 'Unbekannt', es: 'Desconocido' },
  state_arming: {
    en: '{state} (pending)',
    fr: '{state} (en cours)',
    de: '{state} (läuft)',
    es: '{state} (en curso)',
  },

  // Sensor states.
  sensor_open: { en: 'Open', fr: 'Ouvert', de: 'Offen', es: 'Abierto' },
  sensor_closed: { en: 'Closed', fr: 'Fermé', de: 'Geschlossen', es: 'Cerrado' },
  sensor_motion: { en: 'Motion', fr: 'Mouvement', de: 'Bewegung', es: 'Movimiento' },
  sensor_idle: { en: 'Idle', fr: 'Calme', de: 'Ruhig', es: 'En reposo' },
  sensor_wet: { en: 'Leak!', fr: 'Fuite !', de: 'Leck!', es: '¡Fuga!' },
  sensor_dry: { en: 'Dry', fr: 'Sec', de: 'Trocken', es: 'Seco' },
  sensor_alarm: { en: 'Alarm!', fr: 'Alarme !', de: 'Alarm!', es: '¡Alarma!' },
  sensor_ok: { en: 'OK', fr: 'OK', de: 'OK', es: 'OK' },

  // Widgets.
  widget_state: { en: 'State', fr: 'État', de: 'Zustand', es: 'Estado' },
  widget_open_sensors: {
    en: 'Open or active sensors',
    fr: 'Capteurs ouverts ou actifs',
    de: 'Offene oder aktive Sensoren',
    es: 'Sensores abiertos o activos',
  },
  widget_low_battery: {
    en: 'Low battery',
    fr: 'Pile faible',
    de: 'Batterie schwach',
    es: 'Batería baja',
  },
  widget_malfunctions: {
    en: 'Malfunctions',
    fr: 'Dysfonctionnements',
    de: 'Störungen',
    es: 'Averías',
  },
  widget_unlocked: {
    en: 'Unlocked locks',
    fr: 'Serrures déverrouillées',
    de: 'Offene Schlösser',
    es: 'Cerraduras abiertas',
  },
  widget_issues: {
    en: 'Issues to clear on Alarm.com',
    fr: 'Problèmes à acquitter sur Alarm.com',
    de: 'Meldungen auf Alarm.com quittieren',
    es: 'Incidencias que borrar en Alarm.com',
  },
  widget_yes: { en: 'Yes', fr: 'Oui', de: 'Ja', es: 'Sí' },
  widget_no_partition: {
    en: 'No Alarm.com partition yet: check the integration configuration.',
    fr: "Aucune partition Alarm.com pour l'instant : vérifiez la configuration de l'intégration.",
    de: 'Noch keine Alarm.com-Partition: Prüfen Sie die Konfiguration der Integration.',
    es: 'Todavía no hay ninguna partición de Alarm.com: revise la configuración de la integración.',
  },
  widget_disconnected: {
    en: 'Not connected to Alarm.com',
    fr: 'Non connecté à Alarm.com',
    de: 'Nicht mit Alarm.com verbunden',
    es: 'Sin conexión con Alarm.com',
  },
  widget_all_quiet: {
    en: 'All {count} sensors are closed and idle.',
    fr: 'Les {count} capteurs sont fermés et calmes.',
    de: 'Alle {count} Sensoren sind geschlossen und ruhig.',
    es: 'Los {count} sensores están cerrados y en reposo.',
  },
  widget_active_count: {
    en: '{active} of {count} sensors open or active.',
    fr: '{active} capteurs sur {count} ouverts ou actifs.',
    de: '{active} von {count} Sensoren offen oder aktiv.',
    es: '{active} de {count} sensores abiertos o activos.',
  },
  widget_no_sensor: {
    en: 'No Alarm.com sensor found.',
    fr: 'Aucun capteur Alarm.com trouvé.',
    de: 'Kein Alarm.com-Sensor gefunden.',
    es: 'No se encontró ningún sensor de Alarm.com.',
  },
  button_arm_away: {
    en: 'Arm away',
    fr: 'Armer absence',
    de: 'Extern scharf',
    es: 'Armar ausente',
  },
  button_arm_stay: {
    en: 'Arm stay',
    fr: 'Armer présence',
    de: 'Intern scharf',
    es: 'Armar en casa',
  },
  button_arm_night: { en: 'Arm night', fr: 'Armer nuit', de: 'Nacht scharf', es: 'Armar noche' },
  button_disarm: { en: 'Disarm', fr: 'Désarmer', de: 'Unscharf', es: 'Desarmar' },

  // Toasts and action messages.
  toast_arming: {
    en: 'Command sent to Alarm.com: {state}.',
    fr: 'Commande envoyée à Alarm.com : {state}.',
    de: 'Befehl an Alarm.com gesendet: {state}.',
    es: 'Orden enviada a Alarm.com: {state}.',
  },
  toast_disarm_forbidden: {
    en: 'Disarming from the dashboard is disabled in the configuration.',
    fr: 'Le désarmement depuis le tableau de bord est désactivé dans la configuration.',
    de: 'Unscharfschalten über das Dashboard ist in der Konfiguration deaktiviert.',
    es: 'Desarmar desde el panel está desactivado en la configuración.',
  },
  action_connected: {
    en: 'Connected to {provider}: {partitions} partition(s), {sensors} sensor(s), {others} other device(s).',
    fr: 'Connecté à {provider} : {partitions} partition(s), {sensors} capteur(s), {others} autre(s) appareil(s).',
    de: 'Mit {provider} verbunden: {partitions} Partition(en), {sensors} Sensor(en), {others} weitere(s) Gerät(e).',
    es: 'Conectado a {provider}: {partitions} partición(es), {sensors} sensor(es), {others} otro(s) dispositivo(s).',
  },
  action_otp_sent: {
    en: 'Code sent. Enter it with "Verify the two-factor code".',
    fr: 'Code envoyé. Saisissez-le avec « Valider le code de double authentification ».',
    de: 'Code gesendet. Geben Sie ihn mit „Zwei-Faktor-Code prüfen“ ein.',
    es: 'Código enviado. Introdúzcalo con «Verificar el código de doble factor».',
  },
  action_otp_verified: {
    en: 'Code accepted: Gladys is now a trusted device on Alarm.com.',
    fr: 'Code accepté : Gladys est maintenant un appareil de confiance sur Alarm.com.',
    de: 'Code akzeptiert: Gladys ist jetzt ein vertrauenswürdiges Gerät bei Alarm.com.',
    es: 'Código aceptado: Gladys es ahora un dispositivo de confianza en Alarm.com.',
  },

  // Connection status (Configuration screen).
  status_not_configured: {
    en: 'Enter your Alarm.com username and password.',
    fr: 'Saisissez votre identifiant et votre mot de passe Alarm.com.',
    de: 'Geben Sie Ihren Alarm.com-Benutzernamen und Ihr Passwort ein.',
    es: 'Introduzca su usuario y su contraseña de Alarm.com.',
  },
  status_bad_credentials: {
    en: 'Alarm.com refused the username or the password.',
    fr: "Alarm.com a refusé l'identifiant ou le mot de passe.",
    de: 'Alarm.com hat den Benutzernamen oder das Passwort abgelehnt.',
    es: 'Alarm.com rechazó el usuario o la contraseña.',
  },
  status_otp_required: {
    en: 'Two-factor code required ({methods}): use the actions below.',
    fr: 'Code de double authentification requis ({methods}) : utilisez les actions ci-dessous.',
    de: 'Zwei-Faktor-Code erforderlich ({methods}): Nutzen Sie die Aktionen unten.',
    es: 'Se necesita un código de doble factor ({methods}): use las acciones de abajo.',
  },
  status_setup_2fa: {
    en: 'Alarm.com asks you to set up two-factor authentication on its website first.',
    fr: "Alarm.com vous demande d'abord de configurer la double authentification sur son site.",
    de: 'Alarm.com verlangt, zuerst die Zwei-Faktor-Authentifizierung auf seiner Website einzurichten.',
    es: 'Alarm.com le pide configurar primero la autenticación de doble factor en su sitio web.',
  },
  status_unreachable: {
    en: 'Alarm.com cannot be reached, retrying.',
    fr: 'Alarm.com est injoignable, nouvel essai en cours.',
    de: 'Alarm.com ist nicht erreichbar, neuer Versuch läuft.',
    es: 'No se puede contactar con Alarm.com, reintentando.',
  },
  status_init_failed: {
    en: 'Initialization failed, check the integration logs.',
    fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
    de: 'Initialisierung fehlgeschlagen, prüfen Sie die Logs der Integration.',
    es: 'La inicialización falló, revise los registros de la integración.',
  },
};

/**
 * Multi-language text of `key`, with its `{placeholders}` filled. A value can
 * itself be a multi-language object (e.g. a translated state name).
 * @param {keyof TEXTS} key
 * @param {Record<string, string|number|object>} [vars]
 * @returns {{ en: string, fr: string, de: string, es: string }}
 */
export function t(key, vars = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    throw new Error(`Unknown text key: ${key}`);
  }
  const result = {};
  for (const lang of LANGUAGES) {
    result[lang] = entry[lang].replace(/\{(\w+)\}/g, (match, name) => {
      const value = vars[name];
      if (value === undefined) {
        return match;
      }
      return typeof value === 'object' ? (value[lang] ?? value.en) : String(value);
    });
  }
  return result;
}

/** Translated name of a partition arming state. */
export function stateText(state) {
  return t(TEXTS[`state_${state}`] ? `state_${state}` : 'state_unknown');
}
