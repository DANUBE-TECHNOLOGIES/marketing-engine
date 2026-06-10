export default function ButtonLink({ href, children, variant = "dark" }) {
  const styles = {
    dark: "bg-gray-900 text-white hover:bg-gray-700",
    light: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    danger: "bg-red-700 text-white hover:bg-red-800",
    success: "bg-green-700 text-white hover:bg-green-800"
  };

  return (
    <a
      href={href}
      className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${styles[variant] || styles.dark}`}
    >
      {children}
    </a>
  );
}
