export const ACQUISITION_EXPERIMENT_ID="hero-cta-human-v1";
export const CONTROL_VARIANT="control";
export const TEST_VARIANT="human-advice-cta";

function hash32(value){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rolloutPercent(){const n=Number(process.env.NEXT_PUBLIC_ACQUISITION_EXPERIMENT_PERCENT||0);return Number.isFinite(n)?Math.max(0,Math.min(50,n)):0}

export function assignmentFor({funnelId,sessionId,override}={}){
  if(override===CONTROL_VARIANT||override===TEST_VARIANT)return override;
  const pct=rolloutPercent();
  if(!pct||!funnelId||!sessionId)return CONTROL_VARIANT;
  return (hash32(`${ACQUISITION_EXPERIMENT_ID}:${funnelId}:${sessionId}`)%100)<pct?TEST_VARIANT:CONTROL_VARIANT;
}

export function getStoredAssignment({funnelId,sessionId,override}={}){
  if(typeof window==="undefined")return CONTROL_VARIANT;
  const key=`mse_acq_exp:${ACQUISITION_EXPERIMENT_ID}:${funnelId}`;
  if(override===CONTROL_VARIANT||override===TEST_VARIANT){sessionStorage.setItem(key,override);return override}
  const stored=sessionStorage.getItem(key);
  if(stored===CONTROL_VARIANT||stored===TEST_VARIANT)return stored;
  const assigned=assignmentFor({funnelId,sessionId});
  sessionStorage.setItem(key,assigned);
  return assigned;
}
