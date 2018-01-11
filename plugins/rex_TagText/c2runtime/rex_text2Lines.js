(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.text2Lines)
        return;

    var NO_NEWLINE = 0;
    var RAW_NEWLINE = 1;
    var WRAPPED_NEWLINE = 2;
    var lineCache = new window.rexObjs.ObjCacheKlass();
    lineCache.newline = function (text, width, newLineMode) {
        var l = this.allocLine() || {};
        l.text = text;
        l.width = width;
        l.newLineMode = newLineMode; // 0= no new line, 1=raw "\n", 2=wrapped "\n"
        return l;
    };

    var __wrappedLines = [];
    var wordWrap = function (text, getTextWidthFn, width, wrapbyword, offsetX) {
        var lines = __wrappedLines;
        lineCache.freeAllLines(lines);

        if (!text || !text.length) {
            return lines;
        }

        if (width <= 2.0) {
            return lines;
        }

        // If under 100 characters (i.e. a fairly short string), try a short string optimisation: just measure the text
        // and see if it fits on one line, without going through the tokenise/wrap.
        // Text musn't contain a linebreak!
        if (text.length <= 100 && text.indexOf("\n") === -1) {
            var allWidth = getTextWidthFn(text);

            if (allWidth <= (width - offsetX)) {
                // fits on one line
                lineCache.freeAllLines(lines);
                lines.push(lineCache.newline(text, allWidth, NO_NEWLINE));
                return lines;
            }
        }

        return wrapText(text, lines, getTextWidthFn, width, wrapbyword, offsetX);
    };

    var wrapText = function (text, lines, getTextWidthFn, width, wrapbyword, offsetX) {
        var wordArray = (wrapbyword) ? TokeniseWords(text) : text;

        var currentLine = "";
        var previousLine;
        var lineWidth;
        var i, wcnt = wordArray.length;
        var lineIndex = 0;
        var line;

        for (i = 0; i < wcnt; i++) {
            // Look for newline
            if (wordArray[i] === "\n") {
                // Flush line.  Recycle a line if possible
                if (lineIndex >= lines.length)
                    lines.push(lineCache.newline(currentLine, getTextWidthFn(currentLine), RAW_NEWLINE));

                lineIndex++;
                currentLine = "";
                offsetX = 0;
                continue;
            }

            // Otherwise add to line
            previousLine = currentLine;
            currentLine += wordArray[i];

            // Measure line
            lineWidth = getTextWidthFn(currentLine);

            // Line too long: wrap the line before this word was added
            if (lineWidth >= (width - offsetX)) {
                // Append the last line's width to the string object
                if (lineIndex >= lines.length)
                    lines.push(lineCache.newline(previousLine, getTextWidthFn(previousLine), WRAPPED_NEWLINE));

                lineIndex++;
                currentLine = wordArray[i];

                // Wrapping by character: avoid lines starting with spaces
                if (!wrapbyword && currentLine === " ")
                    currentLine = "";

                offsetX = 0;
            }
        }

        // Add any leftover line
        if (currentLine.length) {
            if (lineIndex >= lines.length)
                lines.push(lineCache.newline(currentLine, getTextWidthFn(currentLine), NO_NEWLINE));

            lineIndex++;
        }

        // truncate lines to the number that were used. recycle any spare line objects
        for (i = lineIndex; i < lines.length; i++)
            lineCache.freeLine(lines[i]);

        lines.length = lineIndex;
        return lines;
    };

    var __wordsCache = [];
    var TokeniseWords = function (text) {
        __wordsCache.length = 0;
        var currentWord = "";
        var ch;

        // Loop every char
        var i = 0;

        while (i < text.length) {
            ch = text.charAt(i);

            if (ch === "\n") {
                // Dump current word if any
                if (currentWord.length) {
                    __wordsCache.push(currentWord);
                    currentWord = "";
                }

                // Add newline word
                __wordsCache.push("\n");

                ++i;
            }
            // Whitespace or hyphen: swallow rest of whitespace and include in word
            else if (ch === " " || ch === "\t" || ch === "-") {
                do {
                    currentWord += text.charAt(i);
                    i++;
                }
                while (i < text.length && (text.charAt(i) === " " || text.charAt(i) === "\t"));

                __wordsCache.push(currentWord);
                currentWord = "";
            } else if (i < text.length) {
                currentWord += ch;
                i++;
            }
        }

        // Append leftover word if any
        if (currentWord.length)
            __wordsCache.push(currentWord);

        return __wordsCache;
    };

    window.rexObjs.text2Lines = wordWrap;
}());