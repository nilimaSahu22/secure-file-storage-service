interface BadgeProps {
  visibility: "PUBLIC" | "PRIVATE";
}

export function Badge({ visibility }: BadgeProps) {
  const isPublic = visibility === "PUBLIC";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isPublic ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
      }`}
    >
      {isPublic ? "Public" : "Private"}
    </span>
  );
}
