export default function PageHeader({
  title,
  subtitle,
  action
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {title}
        </h1>

        {subtitle && (
          <p className="text-gray-600 mt-2">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}
