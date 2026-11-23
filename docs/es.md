# Alarm.com

Controle su sistema de seguridad Alarm.com desde Gladys Assistant: arme y
desarme la alarma, siga sus sensores de apertura, movimiento, agua y humo, y
maneje las cerraduras, puertas de garaje, luces y termostatos vinculados a su
central.

Alarm.com es un servicio **en la nube**: la integración se comunica con
Alarm.com por Internet, con la misma cuenta que la aplicación Alarm.com. No
habla con la central en su red local.

## Lo que obtiene

| Dispositivo Alarm.com         | En Gladys                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Partición (la alarma)         | Modo de armado: desarmada, armada en casa, armada ausente, armada noche (si se admite) |
| Contacto de puerta/ventana    | Sensor de apertura + batería baja                                                      |
| Detector de movimiento        | Sensor de movimiento + batería baja                                                    |
| Detector de agua              | Sensor de fugas + batería baja                                                         |
| Detector de humo / CO         | Sensor de humo / CO + batería baja                                                     |
| Detector de rotura de cristal | Sensor de vibración + batería baja                                                     |
| Cerradura inteligente         | Cerradura (bloquear / desbloquear) + batería baja                                      |
| Puerta de garaje              | Interruptor (1 = abierta, 0 = cerrada)                                                 |
| Luz / regulador               | Encendido/apagado, brillo                                                              |
| Termostato                    | Temperatura, consigna, humedad (si se mide)                                            |

## Configuración

1. Abra la pestaña **Configuración** de la integración.
2. Introduzca el **usuario** y la **contraseña** de su cuenta de Alarm.com.
   Le recomendamos crear un usuario dedicado a Gladys en la aplicación
   Alarm.com, solo con los permisos necesarios.
3. Si lo desea, cambie el **intervalo de actualización** (60 segundos por
   defecto, 30 como mínimo) y las **opciones de armado**: anular sensores
   abiertos, sin retardo de entrada, armado silencioso. Se aplican si su
   central las admite.
4. Guarde. Los dispositivos aparecen en la pestaña **Descubrimiento**, listos
   para añadirse.

### Autenticación de doble factor

Si su cuenta usa la autenticación de doble factor, el estado de conexión pide
un código:

- **Aplicación de autenticación**: abra **Verificar el código de doble
  factor**, elija _Aplicación de autenticación_ e introduzca el código.
- **SMS o correo**: ejecute primero **Enviar un código de doble factor** y
  luego **Verificar el código de doble factor** con el código recibido.

Gladys queda registrado como dispositivo de confianza («Gladys Assistant» en
la lista de Alarm.com): el código no se vuelve a pedir, ni siquiera tras un
reinicio.

**Probar la conexión** vuelve a iniciar sesión y muestra lo encontrado.

## Escenas

Disparadores (editor de escenas, categoría **Integraciones**):

- **Alarm.com: estado de armado cambiado** — filtro por partición y nuevo
  estado. Variables: `state`, `previous_state`, `partition_name`.
- **Alarm.com: sensor activado** — apertura de puerta o ventana, movimiento,
  agua, humo, CO o rotura de cristal. Variables: `kind`, `sensor_name`.
- **Alarm.com: cerradura bloqueada o desbloqueada** — variables: `state`,
  `lock_name`.
- **Alarm.com: batería baja** — variable: `device_name`.

Acciones:

- **Alarm.com: armar** — modo (ausente, en casa, noche) y opciones. Deje la
  partición vacía para armar todas las particiones.
- **Alarm.com: desarmar** — una partición o todas.
- **Alarm.com: leer el estado** — lee Alarm.com al instante y devuelve el
  estado de armado, el número y los nombres de los sensores abiertos y el
  número de baterías bajas, para las acciones siguientes.

## Widgets del panel

- **Central de alarma** — estado de armado, sensores abiertos, cerraduras
  abiertas, baterías bajas y botones de armado. El botón **Desarmar** solo
  aparece si **Permitir desarmar desde el panel** está activado, y pide
  confirmación.
- **Sensores de alarma** — todos los sensores, primero los abiertos, activos
  o con batería baja.

## Información útil

- Alarm.com no ofrece una API pública oficial a particulares: la integración
  usa la API web del sitio de Alarm.com. Un cambio por su parte puede romperla
  hasta que se publique una actualización.
- Los cambios se leen en cada intervalo de actualización. Gladys no sustituye
  al servicio de vigilancia de su instalador.
- Los modos del termostato (calor, frío, auto) aún no se ofrecen.
