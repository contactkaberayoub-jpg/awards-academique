import { useMemo } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import type { EditorConfig } from 'ckeditor5';
import {
  Alignment,
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  Code,
  CodeBlock,
  Essentials,
  FindAndReplace,
  Fullscreen,
  Heading,
  HorizontalLine,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SelectAll,
  SourceEditing,
  SpecialCharacters,
  SpecialCharactersArrows,
  SpecialCharactersCurrency,
  SpecialCharactersEssentials,
  SpecialCharactersLatin,
  SpecialCharactersMathematical,
  SpecialCharactersText,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableCellProperties,
  TableProperties,
  TableToolbar,
  Underline,
  Undo,
} from 'ckeditor5';
import frTranslations from 'ckeditor5/translations/fr.js';

const DEFAULT_PLACEHOLDER = 'Commencez à rédiger le contenu de votre leçon...';

function buildConfig(placeholder: string): EditorConfig {
  return {
    licenseKey: 'GPL',
    language: 'fr',
    translations: frTranslations,
    placeholder,
    plugins: [
      Alignment,
      Autoformat,
      BlockQuote,
      Bold,
      Code,
      CodeBlock,
      Essentials,
      FindAndReplace,
      Fullscreen,
      Heading,
      HorizontalLine,
      Indent,
      IndentBlock,
      Italic,
      Link,
      List,
      ListProperties,
      Paragraph,
      PasteFromOffice,
      RemoveFormat,
      SelectAll,
      SourceEditing,
      SpecialCharacters,
      SpecialCharactersArrows,
      SpecialCharactersCurrency,
      SpecialCharactersEssentials,
      SpecialCharactersLatin,
      SpecialCharactersMathematical,
      SpecialCharactersText,
      Strikethrough,
      Subscript,
      Superscript,
      Table,
      TableCellProperties,
      TableProperties,
      TableToolbar,
      Underline,
      Undo,
    ],
    toolbar: {
      items: [
        'undo',
        'redo',
        '|',
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'code',
        'subscript',
        'superscript',
        '|',
        'link',
        '|',
        'bulletedList',
        'numberedList',
        '|',
        'alignment',
        '|',
        'outdent',
        'indent',
        '|',
        'blockQuote',
        'codeBlock',
        '|',
        'insertTable',
        '|',
        'findAndReplace',
        'specialCharacters',
        'horizontalLine',
        '|',
        'removeFormat',
        '|',
        'sourceEditing',
        'fullscreen',
      ],
    },
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraphe', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h2', title: 'Titre 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h3', title: 'Titre 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h4', title: 'Titre 3', class: 'ck-heading_heading3' },
      ],
    },
    alignment: {
      options: ['left', 'center', 'right', 'justify'],
    },
    list: {
      properties: {
        styles: true,
        startIndex: true,
        reversed: true,
      },
    },
    link: {
      addTargetToExternalLinks: true,
    },
    table: {
      contentToolbar: ['tableRow', 'tableColumn', 'mergeTableCells', 'tableProperties', 'tableCellProperties'],
    },
  };
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder = DEFAULT_PLACEHOLDER, disabled }: RichTextEditorProps) {
  const config = useMemo(() => buildConfig(placeholder), [placeholder]);

  return (
    <div className="rich-text-editor">
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={value ?? ''}
        disabled={disabled}
        onChange={(_event, editor) => onChange(editor.getData())}      />
    </div>
  );
}
