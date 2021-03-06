/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Text Area field.
 * @author fraser@google.com (Neil Fraser)
 * @author Andrew Mee
 * @author acbart@udel.edu (Austin Cory Bart)
 */
"use strict";

goog.provide("Blockly.FieldExpandableInput");

goog.require("Blockly.FieldTextInput");

Blockly.FieldExpandableInput = function(opt_value, opt_validator) {
  this.textAreaWidth = this.textAreaWidth || 86; // 85
  this.textAreaHeight = this.textAreaHeight || 17; // 17

  opt_value = this.doClassValidation_(opt_value);
  if (opt_value === null) {
    opt_value = FieldExpandableInput.DEFAULT_VALUE;
  } // Else the original value is fine.

  Blockly.FieldExpandableInput.superClass_.constructor.call(this, opt_value, opt_validator);
};

Blockly.utils.object.inherits(Blockly.FieldExpandableInput, Blockly.FieldTextInput);

/**
 * Construct a FieldExpandableInput from a JSON arg object,
 * dereferencing any string table references.
 * @param {!Object} options A JSON object with options (text, and spellcheck).
 * @return {!Blockly.FieldExpandableInput} The new field instance.
 * @package
 * @nocollapse
 */
Blockly.FieldExpandableInput.fromJson = function(options) {
  var text = Blockly.utils.replaceMessageReferences(options["text"]);
  return new Blockly.FieldExpandableInput(text, undefined, options);
};

/**
 * Serializes this field's value to XML. Should only be called by Blockly.Xml.
 * @param {!Element} fieldElement The element to populate with info about the
 *    field's state.
 * @return {!Element} The element containing info about the field's state.
 * @package
 */
Blockly.FieldExpandableInput.prototype.toXml = function(fieldElement) {
  // Replace '\n' characters with html-escaped equivalent '&#10'. This is
  // needed so the plain-text representation of the xml produced by
  // `Blockly.Xml.domToText` will appear on a single line (this is a limitation
  // of the plain-text format).
  fieldElement.textContent = this.getValue();

  fieldElement.setAttribute("width", this.textAreaWidth || 12);
  fieldElement.setAttribute("height", this.textAreaHeight || 13);

  //! Below has been commented out because new line functionality shouldn't be used on Expandable Text Inputs.
  //? .replace(/\n/g, '&#10;');

  return fieldElement;
};

/**
 * Sets the field's value based on the given XML element. Should only be
 * called by Blockly.Xml.
 * @param {!Element} fieldElement The element containing info about the
 *    field's state.
 * @package
 */
Blockly.FieldExpandableInput.prototype.fromXml = function(fieldElement) {
  this.textAreaHeight = parseInt(fieldElement.getAttribute("height"));
  this.textAreaWidth = parseInt(fieldElement.getAttribute("width"));

  this.setValue(fieldElement.textContent);
  //! Below has been commented out because new line functionality shouldn't be used on Expandable Text Inputs.
  //? .replace(/&#10;/g, '\n'));
};

/**
 * Create the block UI for this field.
 * @package
 */
Blockly.FieldExpandableInput.prototype.initView = function() {
  this.createBorderRect_();
  this.textGroup_ = Blockly.utils.dom.createSvgElement(
    Blockly.utils.Svg.G,
    {
      class: "blocklyEditableText",
    },
    this.fieldGroup_
  );
};

/**
 * Get the text from this field as displayed on screen.  May differ from getText
 * due to ellipsis, and other formatting.
 * @return {string} Currently displayed text.
 * @private
 */
Blockly.FieldExpandableInput.prototype.getDisplayText_ = function() {
  var textLines = this.getText();

  if (!textLines) {
    // Prevent the field from disappearing if empty.
    return Blockly.Field.NBSP;
  }

  // Break input text into individual lines of text (broken down by "\n")
  var lines = textLines.split("\n");
  textLines = "";

  for (var i = 0; i < lines.length; i++) {
    var text = lines[i];

    var wordArray = text.split(" ");

    for (var i = 0; i < wordArray.length; i++) {
      if (i !== wordArray.length - 1) wordArray[i] += " ";
    }

    var currentLineWidth = 0;

    for (var i = 0; i < wordArray.length; i++) {
      //* Calculate word width
      var wordWidth = Blockly.utils.dom.getCachelessTextWidth(wordArray[i] + " ", "11pt", "normal", "sans-serif");

      if (currentLineWidth + wordWidth > this.textAreaWidth + 10 + 35) {
        //* Add a "\n" to the end of the Trimmed string // Blockly.Field.NBSP
        wordArray[i - 1] = wordArray[i - 1] + "\n";

        //* Reset current line width to just that of the new word
        currentLineWidth = wordWidth;
      } else currentLineWidth += wordWidth;
    }
  }

  var returnThing = wordArray.join("");

  if (this.sourceBlock_.RTL) {
    // The SVG is LTR, force value to be RTL.
    returnThing += "\u200F";
  }

  return returnThing;
};

/**
 * Updates the text of the textElement.
 * @protected
 */
Blockly.FieldExpandableInput.prototype.render_ = function() {
  // Remove all text group children.
  var currentChild;

  while ((currentChild = this.textGroup_.firstChild)) {
    this.textGroup_.removeChild(currentChild);
  }

  // Add in text elements into the group.
  var lines = this.getDisplayText_().split("\n");
  var y = 0;
  for (var i = 0; i < lines.length; i++) {
    var lineHeight = this.getConstants().FIELD_TEXT_HEIGHT + this.getConstants().FIELD_BORDER_RECT_Y_PADDING;
    var span = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.TEXT,
      {
        class: "blocklyText blocklyMultilineText",
        x: this.getConstants().FIELD_BORDER_RECT_X_PADDING,
        y: y + this.getConstants().FIELD_BORDER_RECT_Y_PADDING,
        dy: this.getConstants().FIELD_TEXT_BASELINE,
      },
      this.textGroup_
    );
    span.appendChild(document.createTextNode(lines[i]));
    y += lineHeight;
  }

  this.updateSize_();

  if (this.isBeingEdited_) {
    if (this.sourceBlock_.RTL) {
      // in RTL, we need to let the browser reflow before resizing
      // in order to get the correct bounding box of the borderRect
      // avoiding issue #2777.
      setTimeout(this.resizeEditor_.bind(this), 0);
    } else {
      this.resizeEditor_();
    }
    var htmlInput = /** @type {!HTMLElement} */ (this.htmlInput_);
    if (!this.isTextValid_) {
      Blockly.utils.dom.addClass(htmlInput, "blocklyInvalidInput");
      Blockly.utils.aria.setState(htmlInput, Blockly.utils.aria.State.INVALID, true);
    } else {
      Blockly.utils.dom.removeClass(htmlInput, "blocklyInvalidInput");
      Blockly.utils.aria.setState(htmlInput, Blockly.utils.aria.State.INVALID, false);
    }
  }
};

/**
 * Updates the size of the field based on the text.
 * @protected
 */
Blockly.FieldExpandableInput.prototype.updateSize_ = function() {
  var nodes = this.textGroup_.childNodes;
  var totalWidth = this.textAreaWidth;
  var totalHeight = this.textAreaHeight;

  // for (var i = 0; i < nodes.length; i++) {
  //   var tspan = /** @type {!Element} */ (nodes[i]);
  //   var textWidth = Blockly.utils.dom.getTextWidth(tspan);
  //   if (textWidth > totalWidth) {
  //     totalWidth = textWidth;
  //   }
  //   totalHeight += this.getConstants().FIELD_TEXT_HEIGHT +
  //       (i > 0 ? this.getConstants().FIELD_BORDER_RECT_Y_PADDING : 0);
  // }

  for (var i = 0; i < nodes.length; i++) {
    var tspan = /** @type {!Element} */ (nodes[i]);
    var textWidth = Blockly.utils.dom.getTextWidth(tspan);
  }

  if (this.borderRect_) {
    totalHeight += this.getConstants().FIELD_BORDER_RECT_Y_PADDING * 2;
    totalWidth += this.getConstants().FIELD_BORDER_RECT_X_PADDING * 2;
    this.borderRect_.setAttribute("width", totalWidth);
    this.borderRect_.setAttribute("height", totalHeight);
  }
  this.size_.width = totalWidth;
  this.size_.height = totalHeight;

  this.positionBorderRect_();
};

/**
 * Create the text input editor widget.
 * @return {!HTMLTextAreaElement} The newly created text input editor.
 * @protected
 */
Blockly.FieldExpandableInput.prototype.widgetCreate_ = function() {
  var div = /** @type {HTMLDivElement} */ (Blockly.WidgetDiv.DIV);
  var scale = this.workspace_.getScale();

  var htmlInput = /** @type {HTMLTextAreaElement} */ (document.createElement("textarea"));
  htmlInput.className = "blocklyHtmlInput blocklyHtmlExpandableTextAreaInput";
  htmlInput.setAttribute("spellcheck", this.spellcheck_);
  var fontSize = this.getConstants().FIELD_TEXT_FONTSIZE * scale + "pt";
  div.style.fontSize = fontSize;
  htmlInput.style.fontSize = fontSize;
  var borderRadius = Blockly.FieldTextInput.BORDERRADIUS * scale + "px";
  htmlInput.style.borderRadius = borderRadius;

  var paddingX = this.getConstants().FIELD_BORDER_RECT_X_PADDING * scale;
  var paddingY = (this.getConstants().FIELD_BORDER_RECT_Y_PADDING * scale) / 2;

  htmlInput.style.padding = paddingY + "px " + paddingX + "px " + paddingY + "px " + paddingX + "px";

  var lineHeight = this.getConstants().FIELD_TEXT_HEIGHT + this.getConstants().FIELD_BORDER_RECT_Y_PADDING;
  htmlInput.style.lineHeight = lineHeight * scale + "px";

  div.appendChild(htmlInput);

  htmlInput.value = htmlInput.defaultValue = this.getEditorText_(this.value_);
  htmlInput.untypedDefaultValue_ = this.value_;
  htmlInput.oldValue_ = null;

  var field = this;

  htmlInput.addEventListener("click", function(event) {
    field.textAreaHeight = event.target.clientHeight - paddingY * 4;
    field.textAreaWidth = event.target.clientWidth - paddingX * 2;
    field.textAreaWidthRaw = event.target.clientWidth;
    field.render_();
  });

  if (Blockly.utils.userAgent.GECKO) {
    // In FF, ensure the browser reflows before resizing to avoid issue #2777.
    setTimeout(this.resizeEditor_.bind(this), 0);
  } else {
    this.resizeEditor_();
  }

  this.bindInputEvents_(htmlInput);

  return htmlInput;
};

/**
 * Handle key down to the editor. Override the text input definition of this
 * so as to not close the editor when enter is typed in.
 * @param {!Event} e Keyboard event.
 * @protected
 */
Blockly.FieldExpandableInput.prototype.onHtmlInputKeyDown_ = function(e) {};

/**
 * CSS for multiline field.  See css.js for use.
 */
Blockly.Css.register([
  /* eslint-disable indent */
  ".blocklyHtmlExpandableTextAreaInput {",
  "font-family: monospace;",
  "resize: both;",
  "overflow: hidden;",
  "height: 100%;",
  "text-align: left;",
  "}",
  /* eslint-enable indent */
]);

Blockly.fieldRegistry.register("field_expandable_input", Blockly.FieldExpandableInput);
