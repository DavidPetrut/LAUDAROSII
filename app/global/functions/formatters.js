export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateTime = (dateString) => {
  return `${formatDate(dateString)} la ${formatTime(dateString)}`;
};

export const getTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Acum";
  if (diffMins < 60) return `Acum ${diffMins} min`;
  if (diffHours < 24) return `Acum ${diffHours} ore`;
  if (diffDays < 7) return `Acum ${diffDays} zile`;
  return formatDate(dateString);
};

export const teamRoleLabels = {
  vocalist: "Vocalist",
  lider_inchinare: "Lider Închinare",
  chitara_electrica: "Chitara Electrica",
  chitara_acustica: "Chitara Acustica",
  bass: "Bass",
  tobe: "Tobe",
  pian: "Pian",
  clape: "Clape",
  vioara: "Vioara",
  sunet: "Sunet",
  proiector: "Proiector",
  director_muzical: "Director Muzical",
  lider_asistent: "Lider Asistent",
  predicator: "Predicator",
};

export const formatTeamRoles = (roles) => {
  if (!roles || roles.length === 0) return "Niciun rol";
  return roles.map((r) => teamRoleLabels[r] || r).join(", ");
};
