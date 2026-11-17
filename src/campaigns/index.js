import campaign2027 from './2027/index.js';

const campaigns = new Map([['2027', campaign2027]]);

export function campaignForYear(year) {
  const campaign = campaigns.get(year);
  if (!campaign) throw new Error(`Unknown campaign year: ${year}`);
  return campaign;
}
