# Alarm.com

Pilotez votre système de sécurité Alarm.com depuis Gladys Assistant : armez
et désarmez l'alarme, suivez vos détecteurs d'ouverture, de mouvement, d'eau
et de fumée, et commandez les serrures, portes de garage, lumières et
thermostats associés à votre centrale.

Alarm.com est un service **cloud** : l'intégration dialogue avec Alarm.com par
Internet, avec le même compte que l'application Alarm.com. Elle ne communique
pas avec la centrale sur votre réseau local.

## Ce que vous obtenez

| Appareil Alarm.com         | Dans Gladys                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Partition (l'alarme)       | Mode d'armement : désarmée, armée présence, armée absence, armée nuit (si prise en charge) |
| Contact de porte/fenêtre   | Capteur d'ouverture + pile faible                                                          |
| Détecteur de mouvement     | Capteur de mouvement + pile faible                                                         |
| Détecteur d'eau            | Capteur de fuite + pile faible                                                             |
| Détecteur de fumée / CO    | Capteur de fumée / CO + pile faible                                                        |
| Détecteur de bris de vitre | Capteur de vibration + pile faible                                                         |
| Serrure connectée          | Serrure (verrouiller / déverrouiller) + pile faible                                        |
| Porte de garage            | Interrupteur (1 = ouverte, 0 = fermée)                                                     |
| Lumière / variateur        | Marche/arrêt, luminosité                                                                   |
| Thermostat                 | Température, consigne, humidité (si mesurée)                                               |

## Configuration

1. Ouvrez l'onglet **Configuration** de l'intégration.
2. Saisissez l'**identifiant** et le **mot de passe** de votre compte
   Alarm.com. Nous vous conseillons de créer un identifiant dédié à Gladys
   dans l'application Alarm.com (**Utilisateurs** / **Identifiants**), avec
   uniquement les droits nécessaires.
3. Modifiez si besoin l'**intervalle de rafraîchissement** (60 secondes par
   défaut, 30 secondes minimum) et les **options d'armement** : ignorer les
   capteurs ouverts, sans délai d'entrée, armement silencieux. Elles
   s'appliquent si votre centrale les prend en charge.
4. Enregistrez. Les appareils apparaissent dans l'onglet **Découverte**, prêts
   à être ajoutés.

### Double authentification

Si votre compte utilise la double authentification, l'état de connexion
demande un code :

- **Application d'authentification** : ouvrez **Valider le code de double
  authentification**, choisissez _Application d'authentification_, saisissez
  le code de l'application.
- **SMS ou e-mail** : lancez d'abord **Envoyer un code de double
  authentification**, puis **Valider le code de double authentification**
  avec le code reçu.

Gladys est alors enregistré comme appareil de confiance (« Gladys Assistant »
dans la liste des appareils de confiance Alarm.com) : le code n'est plus
demandé, y compris après un redémarrage. Supprimer cet appareil de confiance
sur Alarm.com redemande un code.

**Tester la connexion** se reconnecte et liste ce qui a été trouvé.

## Scènes

Déclencheurs (éditeur de scène, catégorie **Intégrations**) :

- **Alarm.com : état d'armement modifié** — filtre sur la partition et le
  nouvel état. Variables : `state`, `previous_state`, `partition_name`.
- **Alarm.com : capteur déclenché** — ouverture d'une porte ou fenêtre,
  mouvement, eau, fumée, CO ou bris de vitre. Filtre sur le capteur et la
  détection. Variables : `kind`, `sensor_name`.
- **Alarm.com : serrure verrouillée ou déverrouillée** — variables : `state`,
  `lock_name`.
- **Alarm.com : pile faible** — variable : `device_name`.

Actions :

- **Alarm.com : armer** — mode (absence, présence, nuit) et options. Laissez
  la partition vide pour armer toutes les partitions.
- **Alarm.com : désarmer** — une partition, ou toutes.
- **Alarm.com : lire l'état** — lit Alarm.com immédiatement et renvoie l'état
  d'armement, le nombre et les noms des capteurs ouverts et le nombre de piles
  faibles, utilisables dans les actions suivantes (ex. « me prévenir au lieu
  d'armer si une fenêtre est ouverte »).

Les déclencheurs et actions standards de Gladys fonctionnent aussi sur tous
les appareils.

## Widgets du tableau de bord

- **Centrale d'alarme** — état d'armement, capteurs ouverts, serrures
  déverrouillées, piles faibles et boutons d'armement. Choisissez la partition
  dans les réglages du widget (la première sinon). Le bouton **Désarmer**
  n'apparaît que si **Autoriser le désarmement depuis le tableau de bord** est
  activé dans la configuration, et demande une confirmation : toute personne
  voyant le tableau de bord pourrait l'utiliser.
- **Capteurs d'alarme** — tous les capteurs, ouverts, actifs ou à pile faible
  en premier.

## Bon à savoir

- Alarm.com ne propose pas d'API publique officielle aux particuliers :
  l'intégration utilise l'API web du site Alarm.com. Un changement de leur
  côté peut la casser jusqu'à la publication d'une mise à jour.
- Les changements sont lus à chaque intervalle de rafraîchissement : une
  alarme déclenchée entre deux lectures apparaît à la suivante. Ne comptez pas
  sur Gladys comme service de télésurveillance : votre installateur reste
  responsable de l'alarme elle-même.
- Les modes du thermostat (chauffage, climatisation, auto) ne sont pas encore
  exposés ; la consigne suit le mode en cours.

## Dépannage

- **« Alarm.com a refusé l'identifiant ou le mot de passe »** : vérifiez-les
  en vous connectant sur www.alarm.com.
- **« Alarm.com vous demande de configurer la double authentification »** :
  connectez-vous une fois sur www.alarm.com et suivez la procédure, puis
  enregistrez à nouveau la configuration.
- **Un appareil manque** : seuls les types listés ci-dessus sont pris en
  charge. Les boutons panique, sirènes et caméras ne le sont pas.
