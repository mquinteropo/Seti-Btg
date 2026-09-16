# Agenda de Glam

App de una sola página para llevar las citas de maquillaje: clienta, fecha y hora,
servicio (solo maquillaje / maquillaje y peinado / novia…), valor total, abono,
saldo pendiente, lugar de la cita y fotos de referencia que manda la clienta.

## Cómo está construida

`index.html` es un artifact publicado en claude.ai. No tiene build ni dependencias:
HTML, CSS y JavaScript en un solo archivo.

Persistencia por capacidades del artifact (no localStorage):

- `db` — una colección `citas`, un documento por cita. Sincroniza en vivo entre
  dispositivos con `onSnapshot`.
- `assets` — las fotos de referencia. Se comprimen en el navegador a 1600 px /
  JPEG 0.82 antes de subirlas; el documento de la cita guarda solo los ids.
- `user` — determina si la vista puede escribir; si no, la agenda queda en modo lectura.

## Campos por cita

Clienta, WhatsApp, número de personas a maquillar, fecha, hora de inicio, duración
(la hora de fin se calcula), servicio, ocasión, estado (agendada / confirmada /
completada / cancelada), modalidad y dirección, costo de transporte, valor del
servicio, abono, medio y fecha del abono, notas y hasta 8 fotos de referencia.

El saldo es siempre `valor + transporte - abono`: no se guarda, se calcula.
