import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const BASE_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'code-block'],
    ['clean'],
  ],
};

const BASE_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'list',
  'bullet',
  'link',
  'code-block',
];

export default function RichTextEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  className,
  modules,
  formats,
}) {
  const resolvedModules = useMemo(
    () => ({
      ...BASE_MODULES,
      ...(modules || {}),
    }),
    [modules],
  );

  const resolvedFormats = useMemo(() => formats || BASE_FORMATS, [formats]);

  return (
    <ReactQuill
      className={className}
      theme={readOnly ? 'bubble' : 'snow'}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      modules={resolvedModules}
      formats={resolvedFormats}
    />
  );
}
