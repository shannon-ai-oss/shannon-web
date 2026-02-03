import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Stack,
  TextField,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Fade,
  alpha,
  useTheme,
  Collapse,
  LinearProgress,
  Alert,
  AlertTitle,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import { serverTimestamp } from '@/lib/localStore';
import {
  DeleteOutline as DeleteOutlineIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  AddOutlined as AddIcon,
  EditOutlined as EditIcon,
  Hub as HubIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  TextFields as TextIcon,
  AccountTree as GraphIcon,
  Compress as CompressIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { memoryApiFetch } from '@/utils/memoryApi';

const NODE_TYPES = {
  fact: { label: 'Fact', color: '#3B82F6', symbol: 'circle' },
  preference: { label: 'Preference', color: '#10B981', symbol: 'diamond' },
  entity: { label: 'Entity', color: '#8B5CF6', symbol: 'rect' },
  goal: { label: 'Goal', color: '#F59E0B', symbol: 'triangle' },
  constraint: { label: 'Constraint', color: '#EF4444', symbol: 'pin' },
  context: { label: 'Context', color: '#6B7280', symbol: 'roundRect' },
};

const NODE_CATEGORIES = {
  personal: { label: 'Personal', color: '#EC4899', icon: '👤' },
  work: { label: 'Work', color: '#3B82F6', icon: '💼' },
  preferences: { label: 'Preferences', color: '#10B981', icon: '⚙️' },
  relationships: { label: 'Relationships', color: '#F59E0B', icon: '👥' },
  projects: { label: 'Projects', color: '#8B5CF6', icon: '📁' },
  skills: { label: 'Skills', color: '#06B6D4', icon: '🎯' },
  other: { label: 'Other', color: '#6B7280', icon: '📝' },
};

// Depth limits per plan for V4
const DEPTH_LIMITS = {
  free: 10,
  starter: 25,
  plus: 50,
  pro: 100,
};

// Word limits per plan for V3
const WORD_LIMITS = {
  free: 100,
  starter: 256,
  plus: 512,
  pro: 2048,
};

const clampWords = (text, maxWords) => {
  if (!text) return '';
  if (!maxWords || !Number.isFinite(maxWords) || maxWords <= 0) {
    return text.trim();
  }
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return words.slice(0, maxWords).join(' ');
};

const buildTextFromNodes = (nodes, maxWords) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return '';
  const combined = nodes
    .map((node) => node?.content)
    .filter(Boolean)
    .join('\n');
  return clampWords(combined, maxWords);
};

const buildNodesFromText = (text) => {
  if (!text) return [];
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => ({
    type: 'fact',
    category: 'personal',
    content: line,
    tags: [],
    importance: 5,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  }));
};

// Node Edit Dialog Component
function NodeEditDialog({ open, onClose, node, onSave, saving }) {
  const [type, setType] = useState(node?.type || 'fact');
  const [category, setCategory] = useState(node?.category || 'other');
  const [content, setContent] = useState(node?.content || '');
  const [tags, setTags] = useState(node?.tags?.join(', ') || '');
  const [importance, setImportance] = useState(node?.importance ?? 5);

  useEffect(() => {
    if (node) {
      setType(node.type || 'fact');
      setCategory(node.category || 'other');
      setContent(node.content || '');
      setTags(node.tags?.join(', ') || '');
      setImportance(node.importance ?? 5);
    } else {
      setType('fact');
      setCategory('other');
      setContent('');
      setTags('');
      setImportance(5);
    }
  }, [node, open]);

  const handleSave = () => {
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      id: node?.id,
      type,
      category,
      content: content.trim(),
      tags: tagList,
      importance,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, background: '#fefdfb' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PsychologyIcon sx={{ color: '#e86e3a' }} />
          <Typography variant="h6" sx={{ color: '#1a1a1a' }}>{node?.id ? 'Edit Memory' : 'Add Memory'}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={type} onChange={(e) => setType(e.target.value)} label="Type">
                  {Object.entries(NODE_TYPES).map(([key, { label, color }]) => (
                    <MenuItem key={key} value={key}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                        <span>{label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Category">
                  {Object.entries(NODE_CATEGORIES).map(([key, { label, icon }]) => (
                    <MenuItem key={key} value={key}>
                      {icon} {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            label="What should Shannon remember?"
            multiline
            minRows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g., I prefer concise explanations with code examples"
            fullWidth
          />

          <TextField
            label="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="coding, preferences, work"
            size="small"
            fullWidth
          />

          <Box>
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 500, color: '#1a1a1a' }}>
              Importance: {importance}/10
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <Box
                  key={val}
                  component="button"
                  type="button"
                  onClick={() => setImportance(val)}
                  aria-label={`Set importance to ${val}`}
                  aria-pressed={val === importance}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    border: 'none',
                    padding: 0,
                    appearance: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: val <= importance
                      ? val <= 3 ? '#10B981' : val <= 7 ? '#3B82F6' : '#F59E0B'
                      : 'rgba(0,0,0,0.08)',
                    color: val <= importance ? 'white' : '#6b7280',
                    transition: 'all 0.15s',
                    '&:hover': { transform: 'scale(1.1)' },
                    '&:focus-visible': {
                      outline: '2px solid #e86e3a',
                      outlineOffset: 2,
                    },
                  }}
                >
                  {val}
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#6b7280' }}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!content.trim() || saving}
          startIcon={saving ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          sx={{
            background: 'linear-gradient(135deg, #e86e3a 0%, #d35f2d 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #f07a44 0%, #e86e3a 100%)' },
          }}
        >
          {saving ? 'Saving...' : 'Save Memory'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Mode Selection Dialog
function ModeSelectionDialog({ open, onClose, currentMode, onConfirm, hasV3Data, hasV4Data, converting }) {
  const [selectedMode, setSelectedMode] = useState(currentMode);

  useEffect(() => {
    setSelectedMode(currentMode);
  }, [currentMode, open]);

  const handleConfirm = () => {
    onConfirm(selectedMode);
  };

  const needsConversion = selectedMode !== currentMode;
  const switchingToV4 = selectedMode === 'v4' && currentMode === 'v3';
  const switchingToV3 = selectedMode === 'v3' && currentMode === 'v4';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, background: '#fefdfb' } }}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SettingsIcon sx={{ color: '#e86e3a' }} />
          <Typography variant="h6" sx={{ color: '#1a1a1a' }}>Memory Mode</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Choose how Shannon remembers you</AlertTitle>
          Only ONE mode can be active at a time. Shannon will use the selected mode in all conversations.
        </Alert>

        <RadioGroup value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)}>
          {/* V4 Graph Mode */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              borderColor: selectedMode === 'v4' ? '#e86e3a' : 'rgba(0,0,0,0.12)',
              borderWidth: selectedMode === 'v4' ? 2 : 1,
              backgroundColor: selectedMode === 'v4' ? 'rgba(232, 110, 58, 0.04)' : 'white',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedMode('v4')}
          >
            <FormControlLabel
              value="v4"
              control={<Radio sx={{ color: '#e86e3a', '&.Mui-checked': { color: '#e86e3a' } }} />}
              label={
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <GraphIcon sx={{ color: '#e86e3a' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                      Knowledge Graph (Recommended)
                    </Typography>
                    {currentMode === 'v4' && (
                      <Chip label="Active" size="small" sx={{ backgroundColor: '#10B981', color: 'white' }} />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5, ml: 4 }}>
                    Structured memory with categories, importance levels, and connections.
                    Best for detailed personalization and easy management.
                  </Typography>
                  {hasV4Data && (
                    <Typography variant="caption" sx={{ color: '#10B981', ml: 4, display: 'block', mt: 0.5 }}>
                      You have existing graph data
                    </Typography>
                  )}
                </Box>
              }
              sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
            />
          </Paper>

          {/* V3 Text Mode */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: selectedMode === 'v3' ? '#e86e3a' : 'rgba(0,0,0,0.12)',
              borderWidth: selectedMode === 'v3' ? 2 : 1,
              backgroundColor: selectedMode === 'v3' ? 'rgba(232, 110, 58, 0.04)' : 'white',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedMode('v3')}
          >
            <FormControlLabel
              value="v3"
              control={<Radio sx={{ color: '#e86e3a', '&.Mui-checked': { color: '#e86e3a' } }} />}
              label={
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TextIcon sx={{ color: '#6b7280' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                      Text Profile (Legacy)
                    </Typography>
                    {currentMode === 'v3' && (
                      <Chip label="Active" size="small" sx={{ backgroundColor: '#10B981', color: 'white' }} />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5, ml: 4 }}>
                    Simple text-based memory. Compact and straightforward,
                    but less structured than the graph mode.
                  </Typography>
                  {hasV3Data && (
                    <Typography variant="caption" sx={{ color: '#10B981', ml: 4, display: 'block', mt: 0.5 }}>
                      You have existing text data
                    </Typography>
                  )}
                </Box>
              }
              sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
            />
          </Paper>
        </RadioGroup>

        {needsConversion && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>Mode Change</AlertTitle>
            {switchingToV4 && hasV3Data && (
              <>
                Switching to Graph mode. Your text memory will be converted to structured nodes.
                This is recommended for better personalization.
              </>
            )}
            {switchingToV4 && !hasV3Data && (
              <>
                Switching to Graph mode. You'll start with an empty graph.
                Add memories manually or chat with Shannon to build your knowledge graph.
              </>
            )}
            {switchingToV3 && hasV4Data && (
              <>
                Switching to Text mode. Your graph nodes will be summarized into text format.
                Some structure and details may be lost.
              </>
            )}
            {switchingToV3 && !hasV4Data && (
              <>
                Switching to Text mode. You'll start with an empty profile.
                Chat with Shannon to build your text memory.
              </>
            )}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#6b7280' }}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={converting || selectedMode === currentMode}
          startIcon={converting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          sx={{
            background: 'linear-gradient(135deg, #e86e3a 0%, #d35f2d 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #f07a44 0%, #e86e3a 100%)' },
          }}
        >
          {converting ? 'Switching...' : needsConversion ? 'Switch Mode' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Memory Graph Component
function MemoryGraph({ nodes, onNodeClick, loading, onAddNode }) {
  const chartRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [ECharts, setECharts] = useState(null);

  useEffect(() => {
    let mounted = true;
    import('echarts-for-react')
      .then((mod) => {
        if (mounted) {
          setECharts(() => mod.default || mod);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const graphData = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { nodes: [], links: [], categories: [] };
    }

    const categories = Object.entries(NODE_CATEGORIES).map(([key, { label, color }]) => ({
      name: label,
      itemStyle: { color },
    }));

    const graphNodes = nodes.map((node) => {
      const catInfo = NODE_CATEGORIES[node.category] || NODE_CATEGORIES.other;
      const typeInfo = NODE_TYPES[node.type] || NODE_TYPES.fact;
      const importance = node.importance || 5;

      const categoryIndex = Object.keys(NODE_CATEGORIES).indexOf(node.category || 'other');
      const nodeIndexInCategory = nodes.filter(n => n.category === node.category).indexOf(node);

      const angle = (categoryIndex / Object.keys(NODE_CATEGORIES).length) * 2 * Math.PI;
      const radius = 200 + (nodeIndexInCategory * 30);
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 50;
      const y = Math.sin(angle) * radius + (Math.random() - 0.5) * 50;

      return {
        id: node.id,
        name: node.content?.substring(0, 40) + (node.content?.length > 40 ? '...' : ''),
        fullContent: node.content,
        value: importance,
        symbolSize: Math.max(24, importance * 7),
        category: categoryIndex,
        x,
        y,
        itemStyle: {
          color: catInfo.color,
          borderColor: typeInfo.color,
          borderWidth: 3,
          shadowBlur: importance > 7 ? 15 : 5,
          shadowColor: alpha(catInfo.color, 0.5),
        },
        label: {
          show: importance > 6,
          position: 'right',
          formatter: '{b}',
          fontSize: 11,
          color: '#1a1a1a',
        },
        nodeData: node,
      };
    });

    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        if (node1.category === node2.category) {
          links.push({
            source: node1.id,
            target: node2.id,
            value: 1,
            lineStyle: { width: 1, opacity: 0.15, curveness: 0.2 },
          });
        }

        const sharedTags = (node1.tags || []).filter(t => (node2.tags || []).includes(t));
        if (sharedTags.length > 0) {
          links.push({
            source: node1.id,
            target: node2.id,
            value: sharedTags.length * 2,
            lineStyle: {
              width: Math.min(sharedTags.length + 1, 4),
              opacity: 0.4,
              curveness: 0.3,
              color: NODE_CATEGORIES[node1.category]?.color || '#6B7280',
            },
          });
        }
      }
    }

    return { nodes: graphNodes, links, categories };
  }, [nodes]);

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fefdfb',
      borderColor: 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      textStyle: { color: '#1a1a1a' },
      formatter: (params) => {
        if (params.dataType === 'node') {
          const node = params.data.nodeData;
          const catInfo = NODE_CATEGORIES[node?.category] || NODE_CATEGORIES.other;
          const typeInfo = NODE_TYPES[node?.type] || NODE_TYPES.fact;
          return `
            <div style="max-width: 320px; padding: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 18px;">${catInfo.icon}</span>
                <span style="font-weight: 600; color: #1a1a1a;">${catInfo.label}</span>
                <span style="background: ${typeInfo.color}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px;">${typeInfo.label}</span>
              </div>
              <div style="line-height: 1.5; color: #1a1a1a;">${node?.content || params.name}</div>
              ${node?.tags?.length ? `<div style="margin-top: 10px; color: #6b7280; font-size: 12px;">Tags: ${node.tags.join(', ')}</div>` : ''}
              <div style="margin-top: 6px; color: #e86e3a; font-size: 12px; font-weight: 500;">Importance: ${node?.importance || 5}/10</div>
            </div>
          `;
        }
        return '';
      },
    },
    legend: {
      data: graphData.categories.map(c => c.name),
      orient: 'horizontal',
      bottom: 20,
      textStyle: { color: '#6b7280', fontSize: 12 },
      itemWidth: 16,
      itemHeight: 16,
      itemGap: 20,
    },
    series: [{
      name: 'Memory Graph',
      type: 'graph',
      layout: 'force',
      data: graphData.nodes,
      links: graphData.links,
      categories: graphData.categories,
      roam: true,
      draggable: true,
      force: { repulsion: 180, gravity: 0.08, edgeLength: [60, 250], friction: 0.55 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
      scaleLimit: { min: 0.25, max: 4 },
      lineStyle: { color: 'source', curveness: 0.3 },
      label: { show: false },
      labelLayout: { hideOverlap: true },
    }],
  }), [graphData]);

  const handleChartClick = useCallback((params) => {
    if (params.dataType === 'node' && params.data?.nodeData) {
      setSelectedNode(params.data.nodeData);
      onNodeClick?.(params.data.nodeData);
    }
  }, [onNodeClick]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 500 }}>
        <Stack alignItems="center" spacing={3}>
          <Box sx={{ position: 'relative' }}>
            <CircularProgress size={60} sx={{ color: '#e86e3a' }} thickness={2} />
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <HubIcon sx={{ fontSize: 28, color: '#e86e3a' }} />
            </Box>
          </Box>
          <Typography variant="body1" sx={{ color: '#6b7280' }}>Loading your knowledge graph...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 500, flexDirection: 'column', gap: 3 }}>
        <Box sx={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(232, 110, 58, 0.1) 0%, rgba(232, 110, 58, 0.05) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HubIcon sx={{ fontSize: 48, color: '#e86e3a' }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 1 }}>Your memory graph is empty</Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: 400 }}>
            Start chatting with Shannon to automatically build your knowledge graph, or add memories manually.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddNode}
          sx={{
            mt: 2, borderRadius: 3, px: 4, py: 1.5,
            background: 'linear-gradient(135deg, #e86e3a 0%, #d35f2d 100%)',
            boxShadow: '0 8px 24px -8px rgba(232, 110, 58, 0.5)',
            '&:hover': { background: 'linear-gradient(135deg, #f07a44 0%, #e86e3a 100%)' },
          }}
        >
          Add First Memory
        </Button>
      </Box>
    );
  }

  if (!ECharts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 500, flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={48} sx={{ color: '#e86e3a' }} thickness={2.5} />
        <Typography variant="body2" sx={{ color: '#6b7280' }}>Loading memory graph...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <ECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%', minHeight: 500 }}
        onEvents={{ click: handleChartClick }}
        opts={{ renderer: 'canvas' }}
      />
      {selectedNode && (
        <Fade in>
          <Paper elevation={12} sx={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', p: 2.5, borderRadius: 3, maxWidth: 420, backgroundColor: '#fefdfb', border: '1px solid rgba(0,0,0,0.08)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                  <Chip label={NODE_TYPES[selectedNode.type]?.label || 'Fact'} size="small" sx={{ backgroundColor: NODE_TYPES[selectedNode.type]?.color || '#6B7280', color: 'white', fontWeight: 500 }} />
                  <Chip label={NODE_CATEGORIES[selectedNode.category]?.label || 'Other'} size="small" variant="outlined" sx={{ borderColor: 'rgba(0,0,0,0.2)', color: '#1a1a1a' }} />
                  {selectedNode.importance >= 8 && <Chip label="Important" size="small" sx={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }} />}
                </Stack>
                <Typography variant="body1" sx={{ color: '#1a1a1a', lineHeight: 1.5 }}>{selectedNode.content}</Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setSelectedNode(null)}
                sx={{ ml: 1, color: '#6b7280' }}
                aria-label="Close details"
              >
                ×
              </IconButton>
            </Stack>
          </Paper>
        </Fade>
      )}
    </Box>
  );
}

// Memory Text View Component (V3)
function MemoryTextView({ textProfile, loading, maxSize }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
        <Stack alignItems="center" spacing={3}>
          <CircularProgress size={50} sx={{ color: '#e86e3a' }} thickness={2} />
          <Typography variant="body1" sx={{ color: '#6b7280' }}>Loading text memory...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!textProfile || textProfile.trim().length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400, flexDirection: 'column', gap: 3 }}>
        <Box sx={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(232, 110, 58, 0.1) 0%, rgba(232, 110, 58, 0.05) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TextIcon sx={{ fontSize: 48, color: '#e86e3a' }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 1 }}>No text memory yet</Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: 400 }}>
            Chat with Shannon to automatically build your text-based memory profile.
          </Typography>
        </Box>
      </Box>
    );
  }

  const wordCount = textProfile.split(/\s+/).filter(Boolean).length;
  const usagePercent = Math.min((wordCount / maxSize) * 100, 100);

  return (
    <Box sx={{ p: 3, height: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>Memory Usage</Typography>
          <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 600 }}>{wordCount} / {maxSize} words</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={usagePercent}
          sx={{
            height: 8, borderRadius: 4, backgroundColor: 'rgba(232, 110, 58, 0.1)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: usagePercent > 80 ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)' : 'linear-gradient(90deg, #e86e3a 0%, #d35f2d 100%)',
            },
          }}
        />
      </Box>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.08)', minHeight: 300 }}>
        <Typography variant="body1" sx={{ color: '#1a1a1a', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{textProfile}</Typography>
      </Paper>
    </Box>
  );
}

// Memory List View Component (V4)
function MemoryListView({ uid, nodes, loading, onAddNode, onEditNode, onDeleteNode }) {
  const nodesByCategory = useMemo(() => {
    const grouped = {};
    for (const node of nodes) {
      const cat = node.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(node);
    }
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => (b.importance ?? 5) - (a.importance ?? 5));
    }
    return grouped;
  }, [nodes]);

  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (nodeId) => {
    if (!uid || !nodeId) return;
    const confirmed = window.confirm('Delete this memory?');
    if (!confirmed) return;
    setDeletingId(nodeId);
    try {
      await onDeleteNode(nodeId);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: '#e86e3a' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>{nodes.length} Memories</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>Organized by category</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddNode} disabled={!uid}
          sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #e86e3a 0%, #d35f2d 100%)', boxShadow: '0 4px 14px -4px rgba(232, 110, 58, 0.4)', '&:hover': { background: 'linear-gradient(135deg, #f07a44 0%, #e86e3a 100%)' } }}>
          Add Memory
        </Button>
      </Box>

      {nodes.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3, backgroundColor: '#fafafa', borderColor: 'rgba(232, 110, 58, 0.25)', borderStyle: 'dashed', borderWidth: 2 }}>
          <PsychologyIcon sx={{ fontSize: 48, color: '#e86e3a', opacity: 0.6, mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#6b7280' }}>No memories yet. Add your first memory or chat with Shannon.</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {Object.entries(nodesByCategory).map(([category, catNodes]) => {
            const catInfo = NODE_CATEGORIES[category] || NODE_CATEGORIES.other;
            return (
              <Box key={category}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(catInfo.color, 0.12), fontSize: '1.1rem' }}>{catInfo.icon}</Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>{catInfo.label}</Typography>
                  <Chip label={catNodes.length} size="small" variant="outlined" sx={{ borderColor: 'rgba(0,0,0,0.12)', color: '#6b7280' }} />
                </Stack>
                <Stack spacing={1}>
                  {catNodes.map((node) => {
                    const typeInfo = NODE_TYPES[node.type] || NODE_TYPES.fact;
                    return (
                      <Paper key={node.id} variant="outlined"
                        sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'flex-start', gap: 2, borderLeft: `3px solid ${typeInfo.color}`, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#fafafa', transition: 'all 0.2s', '&:hover': { backgroundColor: 'white', borderColor: 'rgba(232, 110, 58, 0.3)', boxShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.1)', transform: 'translateX(4px)' } }}>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                            <Chip label={typeInfo.label} size="small" sx={{ backgroundColor: alpha(typeInfo.color, 0.12), color: typeInfo.color, fontWeight: 500, fontSize: '0.7rem' }} />
                            {node.importance >= 8 && <Chip label="Important" size="small" sx={{ fontSize: '0.7rem', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }} />}
                          </Stack>
                          <Typography variant="body1" sx={{ color: '#1a1a1a' }}>{node.content}</Typography>
                          {node.tags?.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {node.tags.map((tag) => <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, borderColor: 'rgba(0,0,0,0.12)', color: '#6b7280' }} />)}
                            </Box>
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => onEditNode(node)}
                            disabled={deletingId === node.id}
                            sx={{ color: '#6b7280', '&:hover': { color: '#e86e3a' } }}
                            aria-label="Edit memory"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(node.id)}
                            disabled={deletingId === node.id}
                            sx={{ color: '#6b7280', '&:hover': { color: '#ef4444' } }}
                            aria-label="Delete memory"
                          >
                            {deletingId === node.id ? <CircularProgress size={16} /> : <DeleteOutlineIcon fontSize="small" />}
                          </IconButton>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

// Main Memory Page Component
export default function MemoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { beginNewChat, resetMemoryProfile } = useChat();
  const uid = user?.uid ?? null;
  const userPlan = user?.plan?.slug || user?.plan_slug || 'free';

  // Memory version state - loaded from local store
  const [memoryVersion, setMemoryVersion] = useState('v4');
  const [versionLoading, setVersionLoading] = useState(true);

  // View mode for V4 (graph or list)
  const [viewMode, setViewMode] = useState('graph');

  // Mode selection dialog
  const [modeDialogOpen, setModeDialogOpen] = useState(false);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Node states
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [textProfile, setTextProfile] = useState('');
  const [textLoading, setTextLoading] = useState(false);

  // Action states
  const [refreshKey, setRefreshKey] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refracting, setRefracting] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Depth limits
  const maxDepth = DEPTH_LIMITS[userPlan] || DEPTH_LIMITS.free;
  const maxWords = WORD_LIMITS[userPlan] || WORD_LIMITS.free;

  // Load memory version preference from backend
  useEffect(() => {
    if (!uid) {
      setVersionLoading(false);
      return;
    }

    const loadVersion = async () => {
      try {
        const data = await memoryApiFetch('/memory/profile/get', { uid });
        if (data) {
          setMemoryVersion(data.memoryVersion || 'v4');
          setTextProfile(data.text || '');
        }
      } catch (error) {
        console.error('Failed to load memory version', error);
      } finally {
        setVersionLoading(false);
      }
    };
    loadVersion();
  }, [uid]);

  // Save memory version to backend when changed
  const saveMemoryVersion = useCallback(async (version) => {
    if (!uid) return;
    try {
      await memoryApiFetch('/memory/profile/set', {
        uid,
        memoryVersion: version,
        text: textProfile,
      });
      setMemoryVersion(version);
    } catch (error) {
      console.error('Failed to save memory version', error);
    }
  }, [uid, textProfile]);

  // Load V4 nodes
  useEffect(() => {
    if (!uid) {
      setNodes([]);
      setLoading(false);
      return () => undefined;
    }

    setLoading(true);
    const loadNodes = async () => {
      try {
        const data = await memoryApiFetch('/memory/nodes/list', { uid });
        setNodes(data?.nodes || []);
      } catch (error) {
        console.error('Failed to load memory nodes', error);
      } finally {
        setLoading(false);
      }
    };
    loadNodes();
    return () => undefined;
  }, [uid, refreshKey]);

  // Load V3 text profile when in V3 mode
  useEffect(() => {
    if (!uid || memoryVersion !== 'v3') return;

    setTextLoading(true);
    const loadTextProfile = async () => {
      try {
        const data = await memoryApiFetch('/memory/profile/get', { uid });
        if (data) {
          setTextProfile(data.text || '');
        }
      } catch (error) {
        console.error('Failed to load text profile', error);
      } finally {
        setTextLoading(false);
      }
    };
    loadTextProfile();
  }, [uid, memoryVersion, refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const handleNodeClick = useCallback((node) => { setEditingNode(node); setEditDialogOpen(true); }, []);
  const handleAddNode = useCallback(() => { setEditingNode(null); setEditDialogOpen(true); }, []);

  const handleSaveNode = async (nodeData) => {
    if (!uid) return;
    setSaving(true);
    try {
      const payload = {
        ...nodeData,
        updated_at: serverTimestamp(),
      };
      await memoryApiFetch('/memory/node/upsert', { uid, node: payload });
      setEditDialogOpen(false);
      handleRefresh();
    } catch (error) {
      console.error('Failed to save memory node', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (!uid || !nodeId) return;
    try {
      await memoryApiFetch('/memory/node/delete', { uid, nodeId });
      handleRefresh();
    } catch (error) {
      console.error('Failed to delete memory node', error);
    }
  };

  const handleDeleteAll = useCallback(async () => {
    if (!uid) return;
    const confirmed = window.confirm('Delete ALL your memories? This cannot be undone.');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await resetMemoryProfile();
      beginNewChat();
      handleRefresh();
    } catch (error) {
      console.error('Failed to delete memory profile', error);
    } finally {
      setDeleting(false);
    }
  }, [uid, resetMemoryProfile, beginNewChat, nodes, handleRefresh]);

  // Handle mode switch with conversion
  const handleModeSwitch = useCallback(async (newMode) => {
    if (!uid || newMode === memoryVersion) {
      setModeDialogOpen(false);
      return;
    }

    setConverting(true);
    try {
      if (newMode === 'v4' && textProfile && nodes.length === 0) {
        const toCreate = buildNodesFromText(textProfile);
        if (toCreate.length) {
          for (const node of toCreate) {
            await memoryApiFetch('/memory/node/upsert', { uid, node });
          }
          alert(`Migrated ${toCreate.length} memories to Knowledge Graph!`);
        }
      } else if (newMode === 'v3' && nodes.length > 0) {
        const nextText = buildTextFromNodes(nodes, maxWords);
        await memoryApiFetch('/memory/profile/set', { uid, memoryVersion: 'v3', text: nextText });
        setTextProfile(nextText);
        const wordCount = nextText.trim() ? nextText.trim().split(/\s+/).length : 0;
        alert(`Converted ${nodes.length} nodes to text (${wordCount} words)`);
      }

      // Save the new version preference
      await saveMemoryVersion(newMode);
      handleRefresh();
      setModeDialogOpen(false);
    } catch (error) {
      console.error('Failed to switch mode', error);
      alert('Failed to switch mode. Please try again.');
    } finally {
      setConverting(false);
    }
  }, [uid, memoryVersion, textProfile, nodes, maxWords, saveMemoryVersion, handleRefresh]);

  // Refract V4 nodes
  const handleRefract = useCallback(async () => {
    if (!uid) return;
    const confirmed = window.confirm('Refract will consolidate similar memories and remove duplicates. Continue?');
    if (!confirmed) return;

    setRefracting(true);
    try {
      const seen = new Set();
      let removed = 0;
      for (const node of nodes) {
        const key = (node?.content || '').trim().toLowerCase();
        if (!key) continue;
        if (seen.has(key)) {
          removed += 1;
          await memoryApiFetch('/memory/node/delete', { uid, nodeId: node.id });
        } else {
          seen.add(key);
        }
      }
      if (removed > 0) {
        alert(`Refracted ${removed} duplicate memories.`);
        handleRefresh();
      } else {
        alert('No duplicates found.');
      }
    } catch (error) {
      console.error('Failed to refract memory', error);
      alert('Refraction failed. Please try again.');
    } finally {
      setRefracting(false);
    }
  }, [uid, handleRefresh]);

  // Compact V3 text
  const handleCompact = useCallback(async () => {
    if (!uid) return;
    const confirmed = window.confirm('Compact will consolidate your text memory to fit within limits. Continue?');
    if (!confirmed) return;

    setCompacting(true);
    try {
      const nextText = clampWords(textProfile, maxWords);
      await memoryApiFetch('/memory/profile/set', { uid, memoryVersion: 'v3', text: nextText });
      setTextProfile(nextText);
      alert('Compaction complete');
      handleRefresh();
    } catch (error) {
      console.error('Failed to compact memory', error);
      alert('Compaction failed. Please try again.');
    } finally {
      setCompacting(false);
    }
  }, [uid, maxWords, handleRefresh]);

  const goToChat = useCallback(() => navigate('/chat'), [navigate]);

  // Stats
  const stats = useMemo(() => {
    const categories = new Set(nodes.map(n => n.category));
    const highPriority = nodes.filter(n => n.importance >= 8).length;
    return { total: nodes.length, categories: categories.size, highPriority };
  }, [nodes]);

  const hasV3Data = Boolean(textProfile && textProfile.trim().length > 0);
  const hasV4Data = nodes.length > 0;

  if (versionLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(180deg, #fefdfb 0%, #f8f6f3 100%)' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={40} sx={{ color: '#e86e3a' }} />
          <Typography sx={{ color: '#6b7280' }}>Loading memory settings...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #fefdfb 0%, #f8f6f3 100%)' }}>
      {/* Top Bar */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'rgba(254, 253, 251, 0.95)', backdropFilter: 'blur(8px)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {/* Left: Title & Mode Indicator */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e86e3a 0%, #d35f2d 100%)', boxShadow: '0 4px 12px -4px rgba(232, 110, 58, 0.4)' }}>
                <PsychologyIcon sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a' }}>Memory</Typography>
            </Stack>

            {/* Current Mode Indicator */}
            <Chip
              icon={memoryVersion === 'v4' ? <GraphIcon sx={{ fontSize: 18 }} /> : <TextIcon sx={{ fontSize: 18 }} />}
              label={memoryVersion === 'v4' ? 'Knowledge Graph' : 'Text Profile'}
              onClick={() => setModeDialogOpen(true)}
              sx={{
                backgroundColor: '#e86e3a',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { backgroundColor: '#d35f2d' },
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
            <Tooltip title="Change memory mode">
              <IconButton
                size="small"
                onClick={() => setModeDialogOpen(true)}
                sx={{ color: '#6b7280' }}
                aria-label="Change memory mode"
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Right: Actions */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {/* Refract/Compact button */}
            {memoryVersion === 'v4' && nodes.length >= 5 && (
              <Tooltip title="Refract (consolidate) memories">
                <IconButton
                  onClick={handleRefract}
                  disabled={refracting}
                  sx={{ color: '#6b7280', '&:hover': { color: '#e86e3a' } }}
                  aria-label="Refract memories"
                >
                  {refracting ? <CircularProgress size={20} /> : <CompressIcon />}
                </IconButton>
              </Tooltip>
            )}
            {memoryVersion === 'v3' && textProfile && (
              <Tooltip title="Compact text memory">
                <IconButton
                  onClick={handleCompact}
                  disabled={compacting}
                  sx={{ color: '#6b7280', '&:hover': { color: '#e86e3a' } }}
                  aria-label="Compact memory"
                >
                  {compacting ? <CircularProgress size={20} /> : <CompressIcon />}
                </IconButton>
              </Tooltip>
            )}

            {/* Refresh */}
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                sx={{ color: '#6b7280', '&:hover': { color: '#e86e3a' } }}
                aria-label="Refresh memory"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            {/* Settings */}
            <Tooltip title="Settings">
              <IconButton
                onClick={() => setSettingsOpen(!settingsOpen)}
                sx={{ color: settingsOpen ? '#e86e3a' : '#6b7280' }}
                aria-label="Toggle settings"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            {/* Chat button */}
            <Button variant="contained" onClick={goToChat} startIcon={<ChatBubbleOutlineIcon />}
              sx={{ ml: 1, borderRadius: 3, background: 'linear-gradient(135deg, #e86e3a 0%, #d35f2d 100%)', boxShadow: '0 4px 14px -4px rgba(232, 110, 58, 0.4)', '&:hover': { background: 'linear-gradient(135deg, #f07a44 0%, #e86e3a 100%)' } }}>
              Chat
            </Button>
          </Stack>
        </Stack>

        {/* Settings Panel */}
        <Collapse in={settingsOpen}>
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Grid container spacing={3}>
              {/* Current Mode Info */}
              <Grid item xs={12}>
                <Alert severity="info" icon={memoryVersion === 'v4' ? <GraphIcon /> : <TextIcon />}>
                  <AlertTitle>Active Mode: {memoryVersion === 'v4' ? 'Knowledge Graph' : 'Text Profile'}</AlertTitle>
                  {memoryVersion === 'v4' ? (
                    <>Shannon uses your <strong>{nodes.length} memory nodes</strong> (up to {maxDepth} in context) to personalize conversations.</>
                  ) : (
                    <>Shannon uses your <strong>text profile</strong> (up to {maxWords} words) to personalize conversations.</>
                  )}
                  <Button size="small" onClick={() => setModeDialogOpen(true)} sx={{ ml: 2, color: '#e86e3a' }}>Change Mode</Button>
                </Alert>
              </Grid>

              {/* Quick Stats */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: 'white' }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <InfoIcon sx={{ color: '#e86e3a', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>Quick Stats ({userPlan.toUpperCase()} Plan)</Typography>
                  </Stack>
                  {memoryVersion === 'v4' ? (
                    <Stack direction="row" spacing={3}>
                      <Box><Typography variant="h4" sx={{ fontWeight: 700, color: '#e86e3a' }}>{stats.total}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>Memories</Typography></Box>
                      <Box><Typography variant="h4" sx={{ fontWeight: 700, color: '#3B82F6' }}>{stats.categories}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>Categories</Typography></Box>
                      <Box><Typography variant="h4" sx={{ fontWeight: 700, color: '#F59E0B' }}>{stats.highPriority}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>Important</Typography></Box>
                      <Box><Typography variant="h4" sx={{ fontWeight: 700, color: '#10B981' }}>{maxDepth}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>Max in Context</Typography></Box>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={3}>
                      <Box><Typography variant="h4" sx={{ fontWeight: 700, color: '#e86e3a' }}>{textProfile ? textProfile.split(/\s+/).length : 0}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>Words</Typography></Box>
                      <Box><Typography variant="h4" sx={{ fontWeight: 700, color: '#10B981' }}>{maxWords}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>Max Words</Typography></Box>
                    </Stack>
                  )}
                </Paper>
              </Grid>

              {/* Danger Zone */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#EF4444' }}>Danger Zone</Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>Permanently delete all memories</Typography>
                    </Box>
                    <Button variant="outlined" color="error" onClick={handleDeleteAll} disabled={deleting || (!hasV3Data && !hasV4Data)} startIcon={deleting ? <CircularProgress size={16} /> : <DeleteOutlineIcon />} sx={{ borderRadius: 2 }}>
                      {deleting ? 'Deleting...' : 'Clear All'}
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>

      {/* V4 View Mode Toggle */}
      {memoryVersion === 'v4' && nodes.length > 0 && (
        <Box sx={{ px: { xs: 2, md: 4 }, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1}>
              <Button variant={viewMode === 'graph' ? 'contained' : 'outlined'} size="small" startIcon={<GraphIcon />} onClick={() => setViewMode('graph')}
                sx={viewMode === 'graph' ? { background: '#e86e3a', '&:hover': { background: '#d35f2d' } } : { borderColor: 'rgba(0,0,0,0.2)', color: '#6b7280' }}>
                Graph
              </Button>
              <Button variant={viewMode === 'list' ? 'contained' : 'outlined'} size="small" startIcon={<EditIcon />} onClick={() => setViewMode('list')}
                sx={viewMode === 'list' ? { background: '#e86e3a', '&:hover': { background: '#d35f2d' } } : { borderColor: 'rgba(0,0,0,0.2)', color: '#6b7280' }}>
                List
              </Button>
            </Stack>
            {viewMode === 'graph' && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddNode} size="small" sx={{ borderRadius: 2, borderColor: '#e86e3a', color: '#e86e3a', '&:hover': { borderColor: '#d35f2d', backgroundColor: 'rgba(232, 110, 58, 0.05)' } }}>
                Add Memory
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {memoryVersion === 'v4' ? (
          viewMode === 'graph' ? (
            <MemoryGraph nodes={nodes} onNodeClick={handleNodeClick} loading={loading} onAddNode={handleAddNode} />
          ) : (
            <MemoryListView uid={uid} nodes={nodes} loading={loading} onAddNode={handleAddNode} onEditNode={handleNodeClick} onDeleteNode={handleDeleteNode} />
          )
        ) : (
          <MemoryTextView textProfile={textProfile} loading={textLoading} maxSize={maxWords} />
        )}
      </Box>

      {/* Dialogs */}
      <NodeEditDialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} node={editingNode} onSave={handleSaveNode} saving={saving} />
      <ModeSelectionDialog open={modeDialogOpen} onClose={() => setModeDialogOpen(false)} currentMode={memoryVersion} onConfirm={handleModeSwitch} hasV3Data={hasV3Data} hasV4Data={hasV4Data} converting={converting} />
    </Box>
  );
}
