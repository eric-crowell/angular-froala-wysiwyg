import { NG_VALUE_ACCESSOR } from '@angular/forms';
import * as i0 from '@angular/core';
import { EventEmitter, forwardRef, Directive, Input, Output, NgModule } from '@angular/core';
import FroalaEditor from 'froala-editor';

class FroalaEditorDirective {
    constructor(el, zone) {
        this.zone = zone;
        // editor options
        this._opts = {
            immediateAngularModelUpdate: false,
            angularIgnoreAttrs: null
        };
        this.SPECIAL_TAGS = ['img', 'button', 'input', 'a'];
        this.INNER_HTML_ATTR = 'innerHTML';
        this._hasSpecialTag = false;
        this._editorInitialized = false;
        this._oldModel = null;
        // Begin ControlValueAccesor methods.
        this.onChange = (_) => {
        };
        this.onTouched = () => {
        };
        // froalaModel directive as output: update model if editor contentChanged
        this.froalaModelChange = new EventEmitter();
        // froalaInit directive as output: send manual editor initialization
        this.froalaInit = new EventEmitter();
        let element = el.nativeElement;
        // check if the element is a special tag
        if (this.SPECIAL_TAGS.indexOf(element.tagName.toLowerCase()) != -1) {
            this._hasSpecialTag = true;
        }
        this._element = element;
        this.zone = zone;
    }
    // Form model content changed.
    writeValue(content) {
        this.updateEditor(content);
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    // End ControlValueAccesor methods.
    // froalaEditor directive as input: store the editor options
    set froalaEditor(opts) {
        this._opts = this.clone(opts || this._opts);
        this._opts = { ...this._opts };
    }
    // TODO: replace clone method with better possible alternate 
    clone(item) {
        const me = this;
        if (!item) {
            return item;
        } // null, undefined values check
        let types = [Number, String, Boolean], result;
        // normalizing primitives if someone did new String('aaa'), or new Number('444');
        types.forEach(function (type) {
            if (item instanceof type) {
                result = type(item);
            }
        });
        if (typeof result == "undefined") {
            if (Object.prototype.toString.call(item) === "[object Array]") {
                result = [];
                item.forEach(function (child, index, array) {
                    result[index] = me.clone(child);
                });
            }
            else if (typeof item == "object") {
                // testing that this is DOM
                if (item.nodeType && typeof item.cloneNode == "function") {
                    result = item.cloneNode(true);
                }
                else if (!item.prototype) { // check that this is a literal
                    if (item instanceof Date) {
                        result = new Date(item);
                    }
                    else {
                        // it is an object literal
                        result = {};
                        for (var i in item) {
                            result[i] = me.clone(item[i]);
                        }
                    }
                }
                else {
                    if (false && item.constructor) {
                        result = new item.constructor();
                    }
                    else {
                        result = item;
                    }
                }
            }
            else {
                result = item;
            }
        }
        return result;
    }
    // froalaModel directive as input: store initial editor content
    set froalaModel(content) {
        this.updateEditor(content);
    }
    // Update editor with model contents.
    updateEditor(content) {
        if (JSON.stringify(this._oldModel) == JSON.stringify(content)) {
            return;
        }
        if (!this._hasSpecialTag) {
            this._oldModel = content;
        }
        else {
            this._model = content;
        }
        if (this._editorInitialized) {
            if (!this._hasSpecialTag) {
                this._editor.html.set(content);
            }
            else {
                this.setContent();
            }
        }
        else {
            if (!this._hasSpecialTag) {
                this._element.innerHTML = content || '';
            }
            else {
                this.setContent();
            }
        }
    }
    // update model if editor contentChanged
    updateModel() {
        this.zone.run(() => {
            let modelContent = null;
            if (this._hasSpecialTag) {
                let attributeNodes = this._element.attributes;
                let attrs = {};
                for (let i = 0; i < attributeNodes.length; i++) {
                    let attrName = attributeNodes[i].name;
                    if (this._opts.angularIgnoreAttrs && this._opts.angularIgnoreAttrs.indexOf(attrName) != -1) {
                        continue;
                    }
                    attrs[attrName] = attributeNodes[i].value;
                }
                if (this._element.innerHTML) {
                    attrs[this.INNER_HTML_ATTR] = this._element.innerHTML;
                }
                modelContent = attrs;
            }
            else {
                let returnedHtml = this._editor.html.get();
                if (typeof returnedHtml === 'string') {
                    modelContent = returnedHtml;
                }
            }
            if (this._oldModel !== modelContent) {
                this._oldModel = modelContent;
                // Update froalaModel.
                this.froalaModelChange.emit(modelContent);
                // Update form model.
                this.onChange(modelContent);
            }
        });
    }
    registerEvent(eventName, callback) {
        if (!eventName || !callback) {
            return;
        }
        if (!this._opts.events) {
            this._opts.events = {};
        }
        this._opts.events[eventName] = callback;
    }
    initListeners() {
        let self = this;
        // Check if we have events on the editor.
        if (this._editor.events) {
            // bind contentChange and keyup event to froalaModel
            this._editor.events.on('contentChanged', function () {
                self.updateModel();
            });
            this._editor.events.on('mousedown', function () {
                setTimeout(function () {
                    self.onTouched();
                }, 0);
            });
            if (this._opts.immediateAngularModelUpdate) {
                this._editor.events.on('keyup', function () {
                    setTimeout(function () {
                        self.updateModel();
                    }, 0);
                });
            }
        }
        this._editorInitialized = true;
    }
    createEditor() {
        if (this._editorInitialized) {
            return;
        }
        this.setContent(true);
        // init editor
        this.zone.runOutsideAngular(() => {
            // Add listeners on initialized event.
            if (!this._opts.events)
                this._opts.events = {};
            // Register initialized event.
            this.registerEvent('initialized', this._opts.events && this._opts.events.initialized);
            const existingInitCallback = this._opts.events.initialized;
            // Default initialized event.
            if (!this._opts.events.initialized || !this._opts.events.initialized.overridden) {
                this._opts.events.initialized = () => {
                    this.initListeners();
                    existingInitCallback && existingInitCallback.call(this._editor, this);
                };
                this._opts.events.initialized.overridden = true;
            }
            // Initialize the Froala Editor.
            this._editor = new FroalaEditor(this._element, this._opts);
        });
    }
    setHtml() {
        this._editor.html.set(this._model || "");
        // This will reset the undo stack everytime the model changes externally. Can we fix this?
        this._editor.undo.reset();
        this._editor.undo.saveStep();
    }
    setContent(firstTime = false) {
        let self = this;
        // Set initial content
        if (this._model || this._model == '') {
            this._oldModel = this._model;
            if (this._hasSpecialTag) {
                let tags = this._model;
                // add tags on element
                if (tags) {
                    for (let attr in tags) {
                        if (tags.hasOwnProperty(attr) && attr != this.INNER_HTML_ATTR) {
                            this._element.setAttribute(attr, tags[attr]);
                        }
                    }
                    if (tags.hasOwnProperty(this.INNER_HTML_ATTR)) {
                        this._element.innerHTML = tags[this.INNER_HTML_ATTR];
                    }
                }
            }
            else {
                if (firstTime) {
                    this.registerEvent('initialized', function () {
                        self.setHtml();
                    });
                }
                else {
                    self.setHtml();
                }
            }
        }
    }
    destroyEditor() {
        if (this._editorInitialized) {
            this._editor.destroy();
            this._editorInitialized = false;
        }
    }
    getEditor() {
        if (this._element) {
            return this._editor;
        }
        return null;
    }
    // send manual editor initialization
    generateManualController() {
        let controls = {
            initialize: this.createEditor.bind(this),
            destroy: this.destroyEditor.bind(this),
            getEditor: this.getEditor.bind(this),
        };
        this.froalaInit.emit(controls);
    }
    // TODO not sure if ngOnInit is executed after @inputs
    ngAfterViewInit() {
        // check if output froalaInit is present. Maybe observers is private and should not be used?? TODO how to better test that an output directive is present.
        if (!this.froalaInit.observers.length) {
            this.createEditor();
        }
        else {
            this.generateManualController();
        }
    }
    ngOnDestroy() {
        this.destroyEditor();
    }
    setDisabledState(isDisabled) {
    }
}
/** @nocollapse */ FroalaEditorDirective.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaEditorDirective, deps: [{ token: i0.ElementRef }, { token: i0.NgZone }], target: i0.ɵɵFactoryTarget.Directive });
/** @nocollapse */ FroalaEditorDirective.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "14.1.3", type: FroalaEditorDirective, selector: "[froalaEditor]", inputs: { froalaEditor: "froalaEditor", froalaModel: "froalaModel" }, outputs: { froalaModelChange: "froalaModelChange", froalaInit: "froalaInit" }, providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef((() => FroalaEditorDirective)),
            multi: true
        }
    ], exportAs: ["froalaEditor"], ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaEditorDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[froalaEditor]',
                    exportAs: 'froalaEditor',
                    providers: [
                        {
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef((() => FroalaEditorDirective)),
                            multi: true
                        }
                    ]
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i0.NgZone }]; }, propDecorators: { froalaEditor: [{
                type: Input
            }], froalaModel: [{
                type: Input
            }], froalaModelChange: [{
                type: Output
            }], froalaInit: [{
                type: Output
            }] } });

class FroalaEditorModule {
    static forRoot() {
        return { ngModule: FroalaEditorModule, providers: [] };
    }
}
/** @nocollapse */ FroalaEditorModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaEditorModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
/** @nocollapse */ FroalaEditorModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.1.3", ngImport: i0, type: FroalaEditorModule, declarations: [FroalaEditorDirective], exports: [FroalaEditorDirective] });
/** @nocollapse */ FroalaEditorModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaEditorModule });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaEditorModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: [FroalaEditorDirective],
                    exports: [FroalaEditorDirective]
                }]
        }] });

class FroalaViewDirective {
    constructor(renderer, element) {
        this.renderer = renderer;
        this._element = element.nativeElement;
    }
    // update content model as it comes
    set froalaView(content) {
        this._element.innerHTML = content;
    }
    ngAfterViewInit() {
        this.renderer.addClass(this._element, "fr-view");
    }
}
/** @nocollapse */ FroalaViewDirective.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaViewDirective, deps: [{ token: i0.Renderer2 }, { token: i0.ElementRef }], target: i0.ɵɵFactoryTarget.Directive });
/** @nocollapse */ FroalaViewDirective.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "14.1.3", type: FroalaViewDirective, selector: "[froalaView]", inputs: { froalaView: "froalaView" }, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaViewDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[froalaView]'
                }]
        }], ctorParameters: function () { return [{ type: i0.Renderer2 }, { type: i0.ElementRef }]; }, propDecorators: { froalaView: [{
                type: Input
            }] } });

class FroalaViewModule {
    static forRoot() {
        return { ngModule: FroalaViewModule, providers: [] };
    }
}
/** @nocollapse */ FroalaViewModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaViewModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
/** @nocollapse */ FroalaViewModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.1.3", ngImport: i0, type: FroalaViewModule, declarations: [FroalaViewDirective], exports: [FroalaViewDirective] });
/** @nocollapse */ FroalaViewModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaViewModule });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FroalaViewModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: [FroalaViewDirective],
                    exports: [FroalaViewDirective]
                }]
        }] });

class FERootModule {
}
/** @nocollapse */ FERootModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FERootModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
/** @nocollapse */ FERootModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.1.3", ngImport: i0, type: FERootModule, imports: [FroalaEditorModule, FroalaViewModule], exports: [FroalaEditorModule,
        FroalaViewModule] });
/** @nocollapse */ FERootModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FERootModule, imports: [FroalaEditorModule.forRoot(),
        FroalaViewModule.forRoot(), FroalaEditorModule,
        FroalaViewModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.1.3", ngImport: i0, type: FERootModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [
                        FroalaEditorModule.forRoot(),
                        FroalaViewModule.forRoot()
                    ],
                    exports: [
                        FroalaEditorModule,
                        FroalaViewModule
                    ]
                }]
        }] });

/**
 * Generated bundle index. Do not edit.
 */

export { FERootModule, FroalaEditorDirective, FroalaEditorModule, FroalaViewDirective, FroalaViewModule };
//# sourceMappingURL=angular-froala-wysiwyg.mjs.map
