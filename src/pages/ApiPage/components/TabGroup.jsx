import React from 'react';
import { motion } from 'framer-motion';
import './TabGroup.css';

const TabGroup = ({ tabs, activeTab, onTabChange, size = 'default' }) => {
  return (
    <div className={`api-tab-group api-tab-group--${size}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            className={`api-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
            role="tab"
            aria-selected={isActive}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {tab.icon && <span className="api-tab-icon">{tab.icon}</span>}
            <span className="api-tab-label">{tab.label}</span>
            {isActive && (
              <motion.div
                className="api-tab-indicator"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default TabGroup;
