import { useState } from 'react';
import { PlaceCard } from '../../components/ui/display/PlaceCard';
import { EmptyState } from '../../components/ui/feedback/EmptyState';
import type { PlaceResponse } from '../../types';
import SoloMatchModal from './SoloMatchModal';

interface SoloSwipeDeckProps {
  places: PlaceResponse[];
}

export default function SoloSwipeDeck({ places }: SoloSwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResponse | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const currentPlace = places[currentIndex];

  function passCurrentPlace() {
    setCurrentIndex((index) => index + 1);
  }

  function likeCurrentPlace() {
    if (!currentPlace) return;
    setSelectedPlace(currentPlace);
    setConfettiTrigger((trigger) => trigger + 1);
  }

  function continueBrowsing() {
    setSelectedPlace(null);
    passCurrentPlace();
  }

  if (!currentPlace) {
    return (
      <EmptyState
        title={places.length === 0 ? 'Chưa có địa điểm phù hợp' : 'Bạn đã xem hết địa điểm'}
        description={
          places.length === 0
            ? 'Hãy thử đổi từ khóa hoặc bộ lọc để tìm thêm địa điểm.'
            : 'Bạn có thể bắt đầu lại bộ bài địa điểm hiện tại.'
        }
        icon="🍜"
        action={
          places.length > 0 ? (
            <button
              type="button"
              className="focus-ring min-h-11 rounded-control bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              onClick={() => setCurrentIndex(0)}
            >
              Quẹt lại từ đầu
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-xl">
        <PlaceCard
          place={currentPlace}
          showActions
          onPass={passCurrentPlace}
          onLike={likeCurrentPlace}
          className="shadow-raised"
        />
        <p className="mt-3 text-center text-caption text-muted-foreground" aria-live="polite">
          Địa điểm {currentIndex + 1} / {places.length}
        </p>
      </div>
      <SoloMatchModal
        place={selectedPlace}
        confettiTrigger={confettiTrigger}
        onClose={() => setSelectedPlace(null)}
        onContinue={continueBrowsing}
      />
    </>
  );
}
