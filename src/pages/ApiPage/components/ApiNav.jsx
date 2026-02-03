import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass,
  Zap,
  Rocket,
  Play,
  Lock,
  Cpu,
  Wrench,
  Braces,
  Radio,
  Search,
  GitBranch,
  Package,
  AlertTriangle,
  Clock,
  Key,
  BarChart2,
} from 'lucide-react';
import './ApiNav.css';

const ICON_MAP = {
  compass: Compass,
  zap: Zap,
  rocket: Rocket,
  play: Play,
  lock: Lock,
  cpu: Cpu,
  wrench: Wrench,
  braces: Braces,
  radio: Radio,
  search: Search,
  'git-branch': GitBranch,
  package: Package,
  'alert-triangle': AlertTriangle,
  clock: Clock,
  key: Key,
  'bar-chart-2': BarChart2,
};

const ApiNav = ({ sections, activeSection, onSectionClick, className = '' }) => {
  return (
    <nav className={`api-nav ${className}`} aria-label="Documentation navigation">
      <div className="api-nav-title">Documentation</div>
      <ul className="api-nav-list">
        {sections.map((section, index) => {
          const IconComponent = ICON_MAP[section.icon] || Compass;
          const isActive = activeSection === section.id;
          // Use /api for overview, /api/section for others (SEO-friendly URLs)
          const sectionPath = section.id === 'overview' ? '/api' : `/api/${section.id}`;

          return (
            <motion.li
              key={section.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={sectionPath}
                className={`api-nav-link ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSectionClick(section.id);
                }}
              >
                <span className="api-nav-icon">
                  <IconComponent size={18} />
                </span>
                <span className="api-nav-text">{section.title}</span>
                {section.isNew && <span className="api-nav-badge">New</span>}
                {isActive && (
                  <motion.span
                    className="api-nav-indicator"
                    layoutId="navIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
};

export default ApiNav;
