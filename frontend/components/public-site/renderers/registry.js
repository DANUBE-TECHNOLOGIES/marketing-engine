import HeroV2Renderer from "./HeroV2Renderer";
import CtaV2Renderer from "./CtaV2Renderer";
import AgencyV2Renderer from "./AgencyV2Renderer";
import FeaturesV2Renderer from "./FeaturesV2Renderer";
import RichTextV2Renderer from "./RichTextV2Renderer";
import ImageTextV2Renderer from "./ImageTextV2Renderer";
import GalleryV2Renderer from "./GalleryV2Renderer";
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
  hero: HeroV2Renderer,
  cta: CtaV2Renderer,
  agency: AgencyV2Renderer,
  features: FeaturesV2Renderer,
  rich_text: RichTextV2Renderer,
  "rich-text": RichTextV2Renderer,
  richtext: RichTextV2Renderer,
  image_text: ImageTextV2Renderer,
  "image-text": ImageTextV2Renderer,
  gallery: GalleryV2Renderer,
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
