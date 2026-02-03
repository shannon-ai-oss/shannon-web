import React from 'react';
import { motion } from 'framer-motion';
import {
  Plug,
  Wrench,
  Search,
  Braces,
  RefreshCw,
  Zap,
} from 'lucide-react';
import './FeatureCard.css';

const ICON_MAP = {
  plug: Plug,
  wrench: Wrench,
  search: Search,
  braces: Braces,
  'refresh-cw': RefreshCw,
  zap: Zap,
};

const FeatureCard = ({ icon, title, description, tag, color, index = 0 }) => {
  const IconComponent = ICON_MAP[icon] || Zap;

  return (
    <motion.div
      className="api-feature-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{
        y: -4,
        borderColor: color ? `${color}40` : 'rgba(255, 23, 68, 0.3)',
        boxShadow: `0 12px 40px ${color ? `${color}20` : 'rgba(255, 23, 68, 0.15)'}`,
      }}
    >
      <div
        className="api-feature-icon"
        style={{ backgroundColor: color ? `${color}20` : undefined }}
      >
        <IconComponent size={24} style={{ color: color || '#ff6b81' }} />
      </div>
      <div className="api-feature-content">
        <div className="api-feature-header">
          <h3>{title}</h3>
          <span
            className="api-feature-tag"
            style={{
              backgroundColor: color ? `${color}20` : undefined,
              color: color || '#ff6b81',
            }}
          >
            {tag}
          </span>
        </div>
        <p>{description}</p>
      </div>
    </motion.div>
  );
};

export default FeatureCard;
