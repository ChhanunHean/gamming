export async function fetchPublicInfo() {
  const res = await fetch('/api/public/info');
  if (!res.ok) throw new Error('Failed to load site info');
  return res.json();
}
