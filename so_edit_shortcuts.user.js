// ==UserScript==
// @name        StackExchange, add some useful keyboard shortcuts
// @description Add keyboard shortcuts to for quoting and more
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.*.com/*
// @exclude     *://chat.*.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @exclude     *://*/review
// @grant       none
// @version     0.1
// @history     0.1 First version
// @author      Håkon Hægland
// @homepage    http://stackapps.com/
// @updateURL   https://github.com/hakonhagland/so-edit-shortcuts/blob/master/so_edit_shortcuts.user.js

// ==/UserScript==
/* global $, StackExchange */
/* eslint-disable no-multi-spaces, curly */

var rootNode = $("#content");
var scConfig = [
    // titleName,   tagText,  btnText,          bSoloTag, bNotTag, keyTxt, keyCode, kbModifiers (Alt/Ctrl/Shift), kbModArry, bWrapByWord
    // 0            1         2                 3      4      5          6   7        8   9
    ["Keyboard",    "kbd",    "<kbd>kb</kbd>",  false, false, "K",       75, ["Alt"], [], true],
];
let targetKeyCodes      = [];
let targetCssClasses    = [];

$("textarea.wmd-input").each (AddOurButtonsAsNeeded);

rootNode.on ("focus",   "textarea.wmd-input", AddOurButtonsAsNeeded);
rootNode.on ("keydown", "textarea.wmd-input", InsertOurTagByKeypress);
rootNode.on ("click",   ".tmAdded",  InsertOurTagByClick);
rootNode.on ("click",   "#self-answer-popup > .popup-actions .popup-submit",  () => {
    $("textarea.wmd-input").each (AddOurButtonsAsNeeded);
} );

/*--- Pre-build button HTML. It's like:
        <li class="wmd-button tmAdded wmd-kbd-button" title="Keyboard tag &lt;kbd&gt; Alt+K">
            <span><kbd>kb</kbd></span>
        </li>
    for each new button.
*/
let btnsHtml = "";
for (let btn of scConfig) {
    let btnClssTxt      = btn[1].replace (/\W/g, "");
    btnClssTxt          = `wmd-${btnClssTxt}-button`;
    let btnTtlDetail    = btn[4]  ?  btn[1]  :  `&lt;${btn[1]}&gt;`;
    let btnKeyHint      = btn[7].join ('+') + `+${btn[5]}`;
    targetCssClasses.push (btnClssTxt);
    btnsHtml += `
        <li class="wmd-button tmAdded ${btnClssTxt}" title="${btn[0]} ${btnTtlDetail} ${btnKeyHint}">
            <span>${btn[2]}</span>
        </li>
    `;
}

//--- Compile keyboard modifiers and quick-check list.
for (let btn of scConfig) {
    let btnMods = btn[7];
    for (let kbMod of btnMods) {
        switch (kbMod.toLowerCase() ) {
            case "alt":     btn[8].push ("altKey");     break;
            case "ctrl":    btn[8].push ("ctrlKey");    break;
            case "shift":   btn[8].push ("shiftKey");   break;
            default:
                console.warn (`***Userscript error: Illegal keyboard modifier: "${kbMod}"`);
            break;
        }
    }
    targetKeyCodes.push (btn[6]);
}

function AddOurButtonsAsNeeded () {
    var jThis   = $(this);
    if ( ! jThis.data ("hasKbdBttn") ) {
        //--- Find the button bar and add our buttons after the last, not help, button.
        var btnBar  = jThis.closest (".wmd-container").find (".wmd-button-bar");
        if (btnBar.length) {
            //--- The button bar takes a while to AJAX-in.
            jThis.data ("loopSafety", 0);
            var bbListTimer = setInterval ( () => {
                var lpCnt   = jThis.data ("loopSafety") + 1;
                jThis.data ("loopSafety", lpCnt);
                if (lpCnt > 100) {  // 100 ~= 15 seconds
                    clearInterval (bbListTimer);
                    if (jThis.is(":visible") ) {  //  Avoid triggering on unused self-answer textarea.
                        console.warn (`***Userscript error: Unable to find the wmd-button-row.`, jThis);
                    }
                }
                var bbList  = btnBar.find (".wmd-button-row");
                if (bbList.length) {
                    clearInterval (bbListTimer);
                    if (jThis.data ("hasKbdBttn") )  return;  // Guard against multiple timer overlap on slow pages.

                    let insrtPnt = bbList.find (".wmd-button").not (".wmd-help-button").last ();
                    insrtPnt.after (btnsHtml);
                    jThis.data ("hasKbdBttn", true);
                }
            }, 150);
        }
        else {
            console.warn (`***Userscript error: Unable to find the button bar.`);
        }
    }
}

function InsertOurTagByKeypress (zEvent) {
    //--- At least one modifier must be set
    if ( !zEvent.altKey  &&  !zEvent.ctrlKey  &&  !zEvent.shiftKey) {
        return true;
    }
    let J = targetKeyCodes.indexOf (zEvent.which);
    if (J < 0)  return true;

    let btn             = scConfig[J];
    let matchesEvent    = true;
    for (let kbMod of btn[8]) {
        if ( ! zEvent[kbMod] ) {
            matchesEvent = false;
            break;
        }
    }
    if (matchesEvent) {
        let newHTML = btn[4]  ?  btn[1]  :  `<${btn[1]}>`;
        InsertOurTag (this, newHTML, btn[3], btn[9]);
        return false;
    }
    //--- Ignore all other keys.
    return true;
}

function InsertOurTagByClick () {
    //--- From the clicked button, find the matching textarea.
    var jThis       = $(this);
    var targArea    = jThis.closest (".wmd-button-bar").nextAll (".js-stacks-validation").find ("textarea.wmd-input");
    if (targArea.length === 0) {
        //-- The "Edit your profile" page currently uses a different (mostly throwback) layout.
        targArea    = jThis.closest (".wmd-button-bar").next ("textarea.wmd-input");
        if (targArea.length === 0) {
            console.warn (`***Userscript error: Unable to find the textarea from button.`);
            return;
        }
    }

    for (let J in targetCssClasses) {
        if (jThis.hasClass (targetCssClasses[J] ) ) {
            let btn     = scConfig[J];
            let newHTML = btn[4]  ?  btn[1]  :  `<${btn[1]}>`;

            InsertOurTag (targArea[0], newHTML, btn[3], btn[9]);
            targArea.focus ();
            try {
                //--- This is a utility function that SE currently provides on its pages.
                StackExchange.MarkdownEditor.refreshAllPreviews ();
            }
            catch (e) {
                console.error ("***Userscript error: refreshAllPreviews() is no longer defined!", e);
            }
            break;
        }
    }
}

function InsertOurTag (node, tagTxt, bTagHasNoEnd, bWrapByWord) {
    //--- Wrap selected text or insert at curser.
    var tagLength       = tagTxt.length;
    var endTag          = tagTxt.replace (/</, "</");
    var unwrapRegex     = new RegExp ('^' + tagTxt + '((?:.|\\n|\\r)*)' + endTag + '$');

    var oldText         = node.value || node.textContent;
    var newText;
    var iTargetStart    = node.selectionStart;
    var iTargetEnd      = node.selectionEnd;
    var selectedText    = oldText.slice (iTargetStart, iTargetEnd);
    var possWrappedTxt;

    if (bTagHasNoEnd) {
        newText         = oldText.slice (0, iTargetStart) + tagTxt + oldText.slice (iTargetStart);
        iTargetStart   += tagLength;
        iTargetEnd     += tagLength;
    }
    else {
        try {
            //--- Lazyman's overrun checking...
            possWrappedTxt  = oldText.slice (iTargetStart - tagLength,  iTargetEnd + tagLength + 1);
        }
        catch (e) {
            possWrappedTxt  = "Text can't be wrapped, cause we overran the string.";
        }

        /*--- Is the current selection wrapped?  If so, just unwrap it.
            This works the same way as SE's bold, italic, code, etc...
            "]text["                --> "<sup>]text[</sup>"
            "<sup>]text[</sup>"     --> "]text["
            "]<sup>text</sup>["     --> "<sup>]<sup>text</sup>[</sup>"

            Except that:
            "]["                    --> "<sup>][</sup>"
            "<sup>][</sup>"         --> "]["
            with no placeholder text.

            And (Wrap by Word Mode):
            "]Shift P["                         --> "<kbd>]Shift</kbd> <kbd>P[</kbd>"
            "<kbd>]Shift</kbd> <kbd>P[</kbd>"   --> "]Shift P["

            And: No wrapping or unwrapping is done on tags with no end tag, nor on non-tag text.

            Note that `]` and `[` denote the selected text here.
        */
        if (possWrappedTxt  &&
            selectedText    == possWrappedTxt.replace (unwrapRegex, "$1")
        ) {
            let coreText    = selectedText;
            if (bWrapByWord) {
                let strpRE  = new RegExp (`${tagTxt}|${endTag}`, 'g');
                coreText    = coreText.replace (strpRE, "");
            }
            iTargetStart   -= tagLength;
            iTargetEnd     += tagLength + 1;
            newText         = oldText.slice (0, iTargetStart) + coreText + oldText.slice (iTargetEnd);
            iTargetEnd      = iTargetStart + coreText.length;
        }
        else {
            /*--- Here we will wrap the selection in our tags, but there is one extra
                condition.  We don't want to wrap leading or trailing whitespace.
            */
            var trimSelctd  = selectedText.match (/^(\s*)(\S?(?:.|\n|\r)*\S)(\s*)$/)  ||  ["", "", "", ""];
            if (trimSelctd.length != 4) {
                console.warn ("***Userscript error: unexpected failure of whitespace RE.");
            }
            else {
                let wrappedText = tagTxt + trimSelctd[2] + endTag;
                if (bWrapByWord  &&  trimSelctd[2].length) {
                    let pieces  = trimSelctd[2].split (/(\W+)/);
                    wrappedText = "";
                    for (let piece of pieces) {
                        if (piece.length  &&  /\w/.test (piece[0]) )
                            wrappedText += tagTxt + piece + endTag;
                        else
                            wrappedText += piece;
                    }
                }
                newText         = trimSelctd[1]     //-- Leading whitespace, if any.
                                + wrappedText
                                + trimSelctd[3]     //-- Trailing whitespace, if any.
                                ;
                newText         = oldText.slice (0, iTargetStart)
                                + newText + oldText.slice (iTargetEnd)
                                ;
                iTargetStart   += tagLength + trimSelctd[1].length;
                iTargetEnd     += wrappedText.length - endTag.length - trimSelctd[2].length - trimSelctd[3].length;
            }
        }
    }

    node.value          = newText;
    //--- After using spelling corrector, this gets buggered, hence the multiple sets.
    node.textContent    = newText;

    //--- Have to reset the selection, since we overwrote the text.
    node.selectionStart = iTargetStart;
    node.selectionEnd   = iTargetEnd;
}

//--- Touch up styles...
var newStyle         = document.createElement ('style');
newStyle.textContent = `
    .tmAdded > span {
        background-image: none;
    }
    .tmAdded:hover {
        color: orange;
    }
    .wmd-kbd-button {
        margin-right: 1ex;
    }
    .wmd-kbd-button > span > kbd {
        border: 0px;
    }
    .wmd-kbd-button:hover > span > kbd {
        background: orange;
    }
    .wmd-br-button > span {
        font-size: 120%;
        font-weight: bold;
    }
`;
document.head.appendChild (newStyle);
