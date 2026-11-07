import 'server-only';
export function batchLeaseSeconds(): number {
  const seconds=Number(process.env.CARD_BATCH_LEASE_SECONDS||120);
  const minimum=process.env.NODE_ENV==='production'?60:1;
  if (!Number.isInteger(seconds)||seconds<minimum||seconds>600) throw Error('PERSISTENCE_UNAVAILABLE');
  return seconds;
}
