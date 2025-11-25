import React from 'react';
import { XIcon } from './Icons';

type FeedbackBannerProps = {
  onClose: () => void;
};

export default function FeedbackBanner({ onClose }: FeedbackBannerProps) {
  return (
    <div className="feedback-banner">
      <div className="feedback-content">
        <span>Having any issues, feedback, or suggestions? We'd love to hear from you!</span>
        <a href="mailto:support@koffice.com">Contact Now</a>
      </div>
      <button className="close-btn" onClick={onClose} aria-label="Close feedback banner">
        <XIcon />
      </button>
    </div>
  );
}