import DestinationsRenderer from "./DestinationsRenderer";
import OffersRenderer from "./OffersRenderer";
import InspirationsRenderer from "./InspirationsRenderer";
import StatsRenderer from "./StatsRenderer";
import PartnersRenderer from "./PartnersRenderer";
import AppointmentRenderer from "./AppointmentRenderer";
import FaqRenderer from "./FaqRenderer";
import ContactRenderer from "./ContactRenderer";
import MapRenderer from "./MapRenderer";
import ReviewsRenderer from "./ReviewsRenderer";

export const PUBLIC_RENDERER_REGISTRY = {
  destinations: DestinationsRenderer,
  offers: OffersRenderer,
  inspirations: InspirationsRenderer,
  stats: StatsRenderer,
  partners: PartnersRenderer,
  appointment: AppointmentRenderer,
  faq: FaqRenderer,
  reviews: ReviewsRenderer,
  contact: ContactRenderer,
  map: MapRenderer,
};

export function getPublicRenderer(type) {
  return (
    PUBLIC_RENDERER_REGISTRY[type] ||
    null
  );
}
