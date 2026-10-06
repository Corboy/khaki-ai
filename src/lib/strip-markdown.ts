/**
 * Markdown reduced to the prose it describes.
 *
 * Used for the frame before the markdown renderer arrives: the assistant's
 * markdown is a separate chunk, and until it lands there is a moment with the
 * customer's own saved conversation on screen. It used to be rendered verbatim
 * -- asterisks visible, and a percent-encoded WhatsApp URL printed in full.
 *
 * Showing nothing there would be worse: a blank panel where their history was.
 * So the text appears immediately, in the words it is made of, and then settles
 * into formatting.
 *
 * Deliberately not a markdown parser. It handles what this app emits -- bold,
 * italics, links, inline code, headings and bullets -- and leaves anything else
 * alone, because the only cost of a miss is a stray asterisk for 200ms.
 */

export function stripMarkdown(text: string): string {
  return (
    text
      // [label](url) -> label
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // **bold** -> bold
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      /*
       * *italic* -> italic, and only when the markers hug the word.
       *
       * The first version accepted a space between marker and word, so
       * "5 * 3 * 2" lost both asterisks and came out as "5  3  2". Caught by the
       * test that checks stripping does not eat characters.
       */
      .replace(/(^|\s)[*_](\S(?:[^*_\n]*\S)?)[*_](?=\s|$)/g, "$1$2")
      // `code` -> code
      .replace(/`([^`]+)`/g, "$1")
      // ## heading -> heading
      .replace(/^#{1,6}\s+/gm, "")
      // - item -> • item
      .replace(/^\s*[-*+]\s+/gm, "• ")
  );
}
