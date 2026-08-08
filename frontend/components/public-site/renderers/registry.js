import DestinationsRenderer from "./DestinationsRenderer";
import OffersRenderer from "./OffersRenderer";
import InspirationsRenderer from "./InspirationsRenderer";
import StatsRenderer from "./StatsRenderer";
import PartnersRenderer from "./PartnersRenderer";
import AppointmentRenderer from "./AppointmentRenderer";
import FaqRenderer from "./FaqRenderer";
import ContactRenderer from "./ContactRenderer";
import MapRenderer from "./MapRenderer";
import HoursRenderer from "./HoursRenderer";
import ReviewsRenderer from "./ReviewsRenderer";
import TestimonialsRenderer from "./TestimonialsRenderer";
import SeparatorRenderer from "./SeparatorRenderer";

export const PUBLIC_RENDERER_REGISTRY = {
  destinations: DestinationsRenderer,
  offers: OffersRenderer,
  inspirations: InspirationsRenderer,
  stats: StatsRenderer,
  partners: PartnersRenderer,
  appointment: AppointmentRenderer,
  faq: FaqRenderer,
  reviews: ReviewsRenderer,
  testimonials: TestimonialsRenderer,
  contact: ContactRenderer,
  map: MapRenderer,
  hours: HoursRenderer,
  separator: SeparatorRenderer,
};

export function getPublicRenderer(type) {
  return (
    PUBLIC_RENDERER_REGISTRY[type] ||
    null
  );
}
