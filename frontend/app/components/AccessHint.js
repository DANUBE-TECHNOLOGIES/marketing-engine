import ButtonLink from "./ButtonLink";

export default function AccessHint() {
  return (
    <div className="bg-yellow-100 text-yellow-900 rounded-xl p-4 text-sm mb-6">
      Pour une navigation adaptée à votre rôle, utilisez le menu autorisé.
      <div className="mt-3">
        <ButtonLink href="/navigation">Ouvrir le menu autorisé</ButtonLink>
      </div>
    </div>
  );
}
