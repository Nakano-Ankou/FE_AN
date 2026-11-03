import { Confetti } from '../../components/ui/effects/Confetti';
import { Modal } from '../../components/ui/feedback/Modal';
import { Button } from '../../components/ui/form/Button';
import type { PlaceResponse } from '../../types';
import { PlaceCard } from '../../components/ui/display/PlaceCard';

interface SoloMatchModalProps {
  place: PlaceResponse | null;
  confettiTrigger: number;
  onClose: () => void;
  onContinue: () => void;
}

export default function SoloMatchModal({
  place,
  confettiTrigger,
  onClose,
  onContinue,
}: SoloMatchModalProps) {
  const mapsUrl = place
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
    : undefined;

  return (
    <>
      <Confetti trigger={confettiTrigger} />
      <Modal
        isOpen={place !== null}
        onClose={onClose}
        title="Chốt kèo!"
        description="Bạn đã chọn địa điểm này cho bữa ăn của mình."
        footer={
          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button variant="ghost" onClick={onContinue}>
              Tiếp tục xem quán khác
            </Button>
            {mapsUrl && (
              <a
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Chỉ đường Google Maps
              </a>
            )}
          </div>
        }
      >
        {place && <PlaceCard place={place} />}
      </Modal>
    </>
  );
}
