// Dynamically loaded pages can start before the shared auth configuration.
// Load the public configuration explicitly rather than assuming script order.
export function makeAuthConfigurationLoader(scope, doc, timeoutMs = 8000) {
 let pending;
 const configured = () => scope.TalkTagAuthConfig?.url && scope.TalkTagAuthConfig?.publishableKey;
 return function load() {
  if (configured()) return Promise.resolve(scope.TalkTagAuthConfig);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
   const script = doc.createElement('script');
   const timeout = setTimeout(() => finish(new Error('auth_config_timeout')), timeoutMs);
   function finish(error) {
    clearTimeout(timeout); script.onload = script.onerror = null; script.remove();
    if (error || !configured()) reject(error || new Error('auth_config_missing'));
    else resolve(scope.TalkTagAuthConfig);
   }
   script.src='/auth-config.js?v=myspace-init-20261105';
   script.onload=()=>finish(); script.onerror=()=>finish(new Error('auth_config_network'));
   doc.head.append(script);
  }).catch(error => { pending = null; throw error; });
  return pending;
 };
}
