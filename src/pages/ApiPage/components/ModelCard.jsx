import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Code } from 'lucide-react';
import './ModelCard.css';

const MODEL_ICONS = {
  balanced: Zap,
  deep: Cpu,
  code: Code,
};

const ModelCard = ({ model, index = 0 }) => {
  const IconComponent = MODEL_ICONS[model.icon] || Cpu;

  return (
    <motion.div
      className="api-model-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{
        borderColor: 'rgba(255, 23, 68, 0.3)',
        background: 'rgba(255, 23, 68, 0.05)',
      }}
    >
      <div className="api-model-header">
        <div className="api-model-icon">
          <IconComponent size={20} />
        </div>
        <code className="api-model-id">{model.id}</code>
        <span className="api-model-name">{model.name}</span>
      </div>
      <p className="api-model-desc">{model.description}</p>
      <div className="api-model-meta">
        <div className="api-model-meta-item">
          <span className="api-meta-label">Context</span>
          <span className="api-meta-value">{model.contextWindow}</span>
        </div>
        <div className="api-model-meta-item">
          <span className="api-meta-label">Best For</span>
          <span className="api-meta-value">{model.bestFor}</span>
        </div>
      </div>
      {model.quotaType === 'calls' && (
        <div className="api-model-badge">
          <span>Call-based quota</span>
        </div>
      )}
    </motion.div>
  );
};

export default ModelCard;
