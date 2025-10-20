import { View, Text, Button } from "@tarojs/components";
import type { FC } from "react";
import type { LegalServiceMock } from "../../../mock/types";

type ServiceCardService = LegalServiceMock & { lawFirm: string };

interface ServiceCardProps {
  service: ServiceCardService;
  lawFirmMeta?: {
    name: string;
    rating?: number;
  };
  onConsult: (service: ServiceCardService) => void;
}

const ServiceCard: FC<ServiceCardProps> = ({ service, lawFirmMeta, onConsult }) => {
  const initials = service.lawyerName?.slice(0, 1) || "律";

  return (
    <View className="service-card-wrapper">
      {lawFirmMeta && (
        <View className="service-card-meta">
          <Text className="meta-label">来自</Text>
          <Text className="meta-name">{lawFirmMeta.name}</Text>
          {lawFirmMeta.rating ? (
            <Text className="meta-rating">★ {lawFirmMeta.rating.toFixed(1)}</Text>
          ) : null}
        </View>
      )}

      <View className="service-card">
        <View className="service-card-header">
          <View className="service-avatar">
            <Text className="avatar-text">{initials}</Text>
          </View>
          <View className="service-heading">
            <Text className="service-title">{service.title}</Text>
            <Text className="service-lawyer">
              {service.lawyerName} · {service.lawyerTitle}
            </Text>
          </View>
        </View>

        <Text className="service-description">{service.description}</Text>

        <View className="service-meta-row">
          <Text className="service-chip">{service.price}</Text>
          <Text className="service-duration">{service.duration}</Text>
        </View>

        <Button
          className="service-cta"
          type="button"
          onClick={() => onConsult(service)}
        >
          立即预约
        </Button>
      </View>
    </View>
  );
};

export default ServiceCard;
