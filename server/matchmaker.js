// matchmaker.js
// Tiered matching: same school → same district → any verified student

const waitingUsers = []; // { socketId, email, domain, school, district, preferSameSchool }

function getDomain(email) {
  return email.split("@")[1]?.toLowerCase() || null;
}

function getDistrict(domain) {
  // In a real app you'd have a lookup table.
  // For now, we treat the domain's root (e.g. "kleinisd") as the district key.
  // e.g. "hseast.kleinisd.net" and "hsnorth.kleinisd.net" share district "kleinisd"
  const parts = domain.split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : domain;
}

function addToQueue(socketId, email, preferSameSchool) {
  const domain = getDomain(email);
  const district = getDistrict(domain);
  waitingUsers.push({ socketId, email, domain, district, preferSameSchool });
}

function removeFromQueue(socketId) {
  const idx = waitingUsers.findIndex((u) => u.socketId === socketId);
  if (idx !== -1) waitingUsers.splice(idx, 1);
}

function findMatch(socketId) {
  const user = waitingUsers.find((u) => u.socketId === socketId);
  if (!user) return null;

  const others = waitingUsers.filter((u) => u.socketId !== socketId);

  // Tier 1: same school (same domain), if user prefers it
  if (user.preferSameSchool) {
    const sameSchool = others.find((u) => u.domain === user.domain);
    if (sameSchool) return sameSchool;
  }

  // Tier 2: same district
  const sameDistrict = others.find((u) => u.district === user.district);
  if (sameDistrict) return sameDistrict;

  // Tier 3: any verified student
  if (others.length > 0) return others[0];

  return null;
}

module.exports = { addToQueue, removeFromQueue, findMatch, waitingUsers };
