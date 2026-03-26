export const getDeviceFingerprint = async (): Promise<string> => {
  let fp = localStorage.getItem('ms_device_fingerprint');
  if (fp) return fp;

  // Generate a hash based on unchanging browser properties
  const components = [
    window.navigator.userAgent,
    window.screen.height,
    window.screen.width,
    new Date().getTimezoneOffset(),
    window.navigator.hardwareConcurrency || 'unknown',
    (window.navigator as any).deviceMemory || 'unknown',
    window.navigator.language
  ];
  
  const rawString = components.join('||');
  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  fp = `fp_${hashHex.substring(0, 16)}`;
  localStorage.setItem('ms_device_fingerprint', fp);
  return fp;
};
