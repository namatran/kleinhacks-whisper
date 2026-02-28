// matchmaker.js
export const waitingUsers = [];

function getDomain(email) {
  return email.split("@")[1]?.toLowerCase() || null;
}

export function addToQueue(socketId, email, preferSameSchool, category = null, interest = null) {
  const domain = getDomain(email);
  waitingUsers.push({ socketId, email, domain, preferSameSchool, category, interest });
}

export function removeFromQueue(socketId) {
  const idx = waitingUsers.findIndex((u) => u.socketId === socketId);
  if (idx !== -1) waitingUsers.splice(idx, 1);
}

export function findMatch(socketId, fallback = false) {
  const user = waitingUsers.find((u) => u.socketId === socketId);
  if (!user) return null;

  const others = waitingUsers.filter((u) => u.socketId !== socketId);

    // Tier 1: same category + same school
  if (user.category) {
    const best = others.find((u) => u.category === user.category && u.domain === user.domain);
    if (best) return { match: best, reason: "same-school-same-interest" };
  }

  // Tier 2: same category, any school
  if (user.category) {
    const sameCategory = others.find((u) => u.category === user.category);
    if (sameCategory) return { match: sameCategory, reason: "same-interest-diff-school" };
  }

  // Tier 3: same school, any interest
  const sameSchool = others.find((u) => u.domain === user.domain);
  if (sameSchool) return { match: sameSchool, reason: "same-school-diff-interest" };

  if (!fallback) return null;

  // Fallback: anyone
  if (others.length > 0) return { match: others[0], reason: "diff-school-diff-interest" };
  return null;
}