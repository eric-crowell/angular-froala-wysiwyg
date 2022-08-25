import { NG_VALUE_ACCESSOR } from "@angular/forms";
import { Directive, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import FroalaEditor from 'froala-editor';
import * as i0 from "@angular/core";
export class FroalaEditorDirective {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmRpcmVjdGl2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Byb2plY3RzL2xpYnJhcnkvc3JjL2VkaXRvci9lZGl0b3IuZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBd0IsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFjLFlBQVksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFVLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUV2RyxPQUFPLFlBQVksTUFBTSxlQUFlLENBQUM7O0FBYXpDLE1BQU0sT0FBTyxxQkFBcUI7SUF3QmhDLFlBQVksRUFBYyxFQUFVLElBQVk7UUFBWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBdEJoRCxpQkFBaUI7UUFDVCxVQUFLLEdBQVE7WUFDbkIsMkJBQTJCLEVBQUUsS0FBSztZQUNsQyxrQkFBa0IsRUFBRSxJQUFJO1NBQ3pCLENBQUM7UUFJTSxpQkFBWSxHQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsb0JBQWUsR0FBVyxXQUFXLENBQUM7UUFDdEMsbUJBQWMsR0FBWSxLQUFLLENBQUM7UUFRaEMsdUJBQWtCLEdBQVksS0FBSyxDQUFDO1FBRXBDLGNBQVMsR0FBVyxJQUFJLENBQUM7UUFlakMscUNBQXFDO1FBQ3JDLGFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ2pCLENBQUMsQ0FBQztRQUNGLGNBQVMsR0FBRyxHQUFHLEVBQUU7UUFDakIsQ0FBQyxDQUFDO1FBdUdGLHlFQUF5RTtRQUMvRCxzQkFBaUIsR0FBc0IsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUV6RSxvRUFBb0U7UUFDMUQsZUFBVSxHQUF5QixJQUFJLFlBQVksRUFBVSxDQUFDO1FBMUh0RSxJQUFJLE9BQU8sR0FBUSxFQUFFLENBQUMsYUFBYSxDQUFDO1FBRXBD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QUM7SUFDakMsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCxlQUFlO1FBQ2IsMEpBQTBKO1FBQzFKLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7WUFDckMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1NBQ3JCO2FBQU07WUFDTCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztTQUNqQztJQUNILENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxVQUFtQjtJQUNwQyxDQUFDOztxSUE3VlUscUJBQXFCO3lIQUFyQixxQkFBcUIsOExBUnJCO1FBQ1Q7WUFDRSxPQUFPLEVBQUUsaUJBQWlCO1lBQzFCLFdBQVcsRUFBRSxVQUFVLEVBQUMsR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUM7WUFDcEQsS0FBSyxFQUFFLElBQUk7U0FDWjtLQUNGOzJGQUVVLHFCQUFxQjtrQkFYakMsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsZ0JBQWdCO29CQUMxQixRQUFRLEVBQUUsY0FBYztvQkFDeEIsU0FBUyxFQUFFO3dCQUNUOzRCQUNFLE9BQU8sRUFBRSxpQkFBaUI7NEJBQzFCLFdBQVcsRUFBRSxVQUFVLEVBQUMsR0FBRyxFQUFFLHNCQUFzQixFQUFDOzRCQUNwRCxLQUFLLEVBQUUsSUFBSTt5QkFDWjtxQkFDRjtpQkFDRjtzSEE0RGMsWUFBWTtzQkFBeEIsS0FBSztnQkFzRE8sV0FBVztzQkFBdkIsS0FBSztnQkFnQ0ksaUJBQWlCO3NCQUExQixNQUFNO2dCQUdHLFVBQVU7c0JBQW5CLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb250cm9sVmFsdWVBY2Nlc3NvciwgTkdfVkFMVUVfQUNDRVNTT1IgfSBmcm9tIFwiQGFuZ3VsYXIvZm9ybXNcIjtcclxuaW1wb3J0IHsgRGlyZWN0aXZlLCBFbGVtZW50UmVmLCBFdmVudEVtaXR0ZXIsIGZvcndhcmRSZWYsIElucHV0LCBOZ1pvbmUsIE91dHB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5cclxuaW1wb3J0IEZyb2FsYUVkaXRvciBmcm9tICdmcm9hbGEtZWRpdG9yJztcclxuXHJcbkBEaXJlY3RpdmUoe1xyXG4gIHNlbGVjdG9yOiAnW2Zyb2FsYUVkaXRvcl0nLFxyXG4gIGV4cG9ydEFzOiAnZnJvYWxhRWRpdG9yJyxcclxuICBwcm92aWRlcnM6IFtcclxuICAgIHtcclxuICAgICAgcHJvdmlkZTogTkdfVkFMVUVfQUNDRVNTT1IsXHJcbiAgICAgIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IEZyb2FsYUVkaXRvckRpcmVjdGl2ZSksXHJcbiAgICAgIG11bHRpOiB0cnVlXHJcbiAgICB9XHJcbiAgXVxyXG59KVxyXG5leHBvcnQgY2xhc3MgRnJvYWxhRWRpdG9yRGlyZWN0aXZlIGltcGxlbWVudHMgQ29udHJvbFZhbHVlQWNjZXNzb3Ige1xyXG5cclxuICAvLyBlZGl0b3Igb3B0aW9uc1xyXG4gIHByaXZhdGUgX29wdHM6IGFueSA9IHtcclxuICAgIGltbWVkaWF0ZUFuZ3VsYXJNb2RlbFVwZGF0ZTogZmFsc2UsXHJcbiAgICBhbmd1bGFySWdub3JlQXR0cnM6IG51bGxcclxuICB9O1xyXG5cclxuICBwcml2YXRlIF9lbGVtZW50OiBhbnk7XHJcblxyXG4gIHByaXZhdGUgU1BFQ0lBTF9UQUdTOiBzdHJpbmdbXSA9IFsnaW1nJywgJ2J1dHRvbicsICdpbnB1dCcsICdhJ107XHJcbiAgcHJpdmF0ZSBJTk5FUl9IVE1MX0FUVFI6IHN0cmluZyA9ICdpbm5lckhUTUwnO1xyXG4gIHByaXZhdGUgX2hhc1NwZWNpYWxUYWc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgLy8gZWRpdG9yIGVsZW1lbnRcclxuICBwcml2YXRlIF9lZGl0b3I6IGFueTtcclxuXHJcbiAgLy8gaW5pdGlhbCBlZGl0b3IgY29udGVudFxyXG4gIHByaXZhdGUgX21vZGVsOiBzdHJpbmc7XHJcblxyXG4gIHByaXZhdGUgX2VkaXRvckluaXRpYWxpemVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gIHByaXZhdGUgX29sZE1vZGVsOiBzdHJpbmcgPSBudWxsO1xyXG5cclxuICBjb25zdHJ1Y3RvcihlbDogRWxlbWVudFJlZiwgcHJpdmF0ZSB6b25lOiBOZ1pvbmUpIHtcclxuXHJcbiAgICBsZXQgZWxlbWVudDogYW55ID0gZWwubmF0aXZlRWxlbWVudDtcclxuXHJcbiAgICAvLyBjaGVjayBpZiB0aGUgZWxlbWVudCBpcyBhIHNwZWNpYWwgdGFnXHJcbiAgICBpZiAodGhpcy5TUEVDSUFMX1RBR1MuaW5kZXhPZihlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSkgIT0gLTEpIHtcclxuICAgICAgdGhpcy5faGFzU3BlY2lhbFRhZyA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcclxuXHJcbiAgICB0aGlzLnpvbmUgPSB6b25lO1xyXG4gIH1cclxuXHJcbiAgLy8gQmVnaW4gQ29udHJvbFZhbHVlQWNjZXNvciBtZXRob2RzLlxyXG4gIG9uQ2hhbmdlID0gKF8pID0+IHtcclxuICB9O1xyXG4gIG9uVG91Y2hlZCA9ICgpID0+IHtcclxuICB9O1xyXG5cclxuICAvLyBGb3JtIG1vZGVsIGNvbnRlbnQgY2hhbmdlZC5cclxuICB3cml0ZVZhbHVlKGNvbnRlbnQ6IGFueSk6IHZvaWQge1xyXG4gICAgdGhpcy51cGRhdGVFZGl0b3IoY29udGVudCk7XHJcbiAgfVxyXG5cclxuICByZWdpc3Rlck9uQ2hhbmdlKGZuOiAoXzogYW55KSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICB0aGlzLm9uQ2hhbmdlID0gZm47XHJcbiAgfVxyXG5cclxuICByZWdpc3Rlck9uVG91Y2hlZChmbjogKCkgPT4gdm9pZCk6IHZvaWQge1xyXG4gICAgdGhpcy5vblRvdWNoZWQgPSBmbjtcclxuICB9XHJcblxyXG4gIC8vIEVuZCBDb250cm9sVmFsdWVBY2Nlc29yIG1ldGhvZHMuXHJcblxyXG4gIC8vIGZyb2FsYUVkaXRvciBkaXJlY3RpdmUgYXMgaW5wdXQ6IHN0b3JlIHRoZSBlZGl0b3Igb3B0aW9uc1xyXG4gIEBJbnB1dCgpIHNldCBmcm9hbGFFZGl0b3Iob3B0czogYW55KSB7XHJcbiAgICB0aGlzLl9vcHRzID0gdGhpcy5jbG9uZSggIG9wdHMgfHwgdGhpcy5fb3B0cyk7XHJcbiAgICB0aGlzLl9vcHRzID0gIHsuLi50aGlzLl9vcHRzfTtcclxuICB9XHJcblxyXG4gICAvLyBUT0RPOiByZXBsYWNlIGNsb25lIG1ldGhvZCB3aXRoIGJldHRlciBwb3NzaWJsZSBhbHRlcm5hdGUgXHJcbiAgcHJpdmF0ZSBjbG9uZShpdGVtKSB7XHJcbiAgXHRjb25zdCBtZSA9IHRoaXM7ICBcclxuICAgICAgaWYgKCFpdGVtKSB7IHJldHVybiBpdGVtOyB9IC8vIG51bGwsIHVuZGVmaW5lZCB2YWx1ZXMgY2hlY2tcclxuXHJcbiAgICAgIGxldCB0eXBlcyA9IFsgTnVtYmVyLCBTdHJpbmcsIEJvb2xlYW4gXSwgXHJcbiAgICAgICAgICByZXN1bHQ7XHJcblxyXG4gICAgICAvLyBub3JtYWxpemluZyBwcmltaXRpdmVzIGlmIHNvbWVvbmUgZGlkIG5ldyBTdHJpbmcoJ2FhYScpLCBvciBuZXcgTnVtYmVyKCc0NDQnKTtcclxuICAgICAgdHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XHJcbiAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIHR5cGUpIHtcclxuICAgICAgICAgICAgICByZXN1bHQgPSB0eXBlKCBpdGVtICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKHR5cGVvZiByZXN1bHQgPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCggaXRlbSApID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcclxuICAgICAgICAgICAgICByZXN1bHQgPSBbXTtcclxuICAgICAgICAgICAgICBpdGVtLmZvckVhY2goZnVuY3Rpb24oY2hpbGQsIGluZGV4LCBhcnJheSkgeyBcclxuICAgICAgICAgICAgICAgICAgcmVzdWx0W2luZGV4XSA9IG1lLmNsb25lKCBjaGlsZCApO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgICAgLy8gdGVzdGluZyB0aGF0IHRoaXMgaXMgRE9NXHJcbiAgICAgICAgICAgICAgaWYgKGl0ZW0ubm9kZVR5cGUgJiYgdHlwZW9mIGl0ZW0uY2xvbmVOb2RlID09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBpdGVtLmNsb25lTm9kZSggdHJ1ZSApOyAgICBcclxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpdGVtLnByb3RvdHlwZSkgeyAvLyBjaGVjayB0aGF0IHRoaXMgaXMgYSBsaXRlcmFsXHJcbiAgICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IERhdGUoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBhbiBvYmplY3QgbGl0ZXJhbFxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBtZS5jbG9uZSggaXRlbVtpXSApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKGZhbHNlICYmIGl0ZW0uY29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBpdGVtLmNvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBpdGVtO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZXN1bHQgPSBpdGVtO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG4gIC8vIGZyb2FsYU1vZGVsIGRpcmVjdGl2ZSBhcyBpbnB1dDogc3RvcmUgaW5pdGlhbCBlZGl0b3IgY29udGVudFxyXG4gIEBJbnB1dCgpIHNldCBmcm9hbGFNb2RlbChjb250ZW50OiBhbnkpIHtcclxuICAgIHRoaXMudXBkYXRlRWRpdG9yKGNvbnRlbnQpO1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIGVkaXRvciB3aXRoIG1vZGVsIGNvbnRlbnRzLlxyXG4gIHByaXZhdGUgdXBkYXRlRWRpdG9yKGNvbnRlbnQ6IGFueSkge1xyXG4gICAgaWYgKEpTT04uc3RyaW5naWZ5KHRoaXMuX29sZE1vZGVsKSA9PSBKU09OLnN0cmluZ2lmeShjb250ZW50KSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0aGlzLl9oYXNTcGVjaWFsVGFnKSB7XHJcbiAgICAgIHRoaXMuX29sZE1vZGVsID0gY29udGVudDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX21vZGVsID0gY29udGVudDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5fZWRpdG9ySW5pdGlhbGl6ZWQpIHtcclxuICAgICAgaWYgKCF0aGlzLl9oYXNTcGVjaWFsVGFnKSB7XHJcbiAgICAgICAgdGhpcy5fZWRpdG9yLmh0bWwuc2V0KGNvbnRlbnQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuc2V0Q29udGVudCgpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoIXRoaXMuX2hhc1NwZWNpYWxUYWcpIHtcclxuICAgICAgICB0aGlzLl9lbGVtZW50LmlubmVySFRNTCA9IGNvbnRlbnQgfHwgJyc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5zZXRDb250ZW50KCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGZyb2FsYU1vZGVsIGRpcmVjdGl2ZSBhcyBvdXRwdXQ6IHVwZGF0ZSBtb2RlbCBpZiBlZGl0b3IgY29udGVudENoYW5nZWRcclxuICBAT3V0cHV0KCkgZnJvYWxhTW9kZWxDaGFuZ2U6IEV2ZW50RW1pdHRlcjxhbnk+ID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XHJcblxyXG4gIC8vIGZyb2FsYUluaXQgZGlyZWN0aXZlIGFzIG91dHB1dDogc2VuZCBtYW51YWwgZWRpdG9yIGluaXRpYWxpemF0aW9uXHJcbiAgQE91dHB1dCgpIGZyb2FsYUluaXQ6IEV2ZW50RW1pdHRlcjxPYmplY3Q+ID0gbmV3IEV2ZW50RW1pdHRlcjxPYmplY3Q+KCk7XHJcblxyXG4gIC8vIHVwZGF0ZSBtb2RlbCBpZiBlZGl0b3IgY29udGVudENoYW5nZWRcclxuICBwcml2YXRlIHVwZGF0ZU1vZGVsKCkge1xyXG4gICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XHJcblxyXG4gICAgICBsZXQgbW9kZWxDb250ZW50OiBhbnkgPSBudWxsO1xyXG5cclxuICAgICAgaWYgKHRoaXMuX2hhc1NwZWNpYWxUYWcpIHtcclxuXHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZU5vZGVzID0gdGhpcy5fZWxlbWVudC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgIGxldCBhdHRycyA9IHt9O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGF0dHJpYnV0ZU5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgICAgICAgbGV0IGF0dHJOYW1lID0gYXR0cmlidXRlTm9kZXNbaV0ubmFtZTtcclxuICAgICAgICAgIGlmICh0aGlzLl9vcHRzLmFuZ3VsYXJJZ25vcmVBdHRycyAmJiB0aGlzLl9vcHRzLmFuZ3VsYXJJZ25vcmVBdHRycy5pbmRleE9mKGF0dHJOYW1lKSAhPSAtMSkge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBhdHRyc1thdHRyTmFtZV0gPSBhdHRyaWJ1dGVOb2Rlc1tpXS52YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9lbGVtZW50LmlubmVySFRNTCkge1xyXG4gICAgICAgICAgYXR0cnNbdGhpcy5JTk5FUl9IVE1MX0FUVFJdID0gdGhpcy5fZWxlbWVudC5pbm5lckhUTUw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb2RlbENvbnRlbnQgPSBhdHRycztcclxuICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgbGV0IHJldHVybmVkSHRtbDogYW55ID0gdGhpcy5fZWRpdG9yLmh0bWwuZ2V0KCk7XHJcbiAgICAgICAgaWYgKHR5cGVvZiByZXR1cm5lZEh0bWwgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICBtb2RlbENvbnRlbnQgPSByZXR1cm5lZEh0bWw7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLl9vbGRNb2RlbCAhPT0gbW9kZWxDb250ZW50KSB7XHJcbiAgICAgICAgdGhpcy5fb2xkTW9kZWwgPSBtb2RlbENvbnRlbnQ7XHJcblxyXG4gICAgICAgIC8vIFVwZGF0ZSBmcm9hbGFNb2RlbC5cclxuICAgICAgICB0aGlzLmZyb2FsYU1vZGVsQ2hhbmdlLmVtaXQobW9kZWxDb250ZW50KTtcclxuXHJcbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gbW9kZWwuXHJcbiAgICAgICAgdGhpcy5vbkNoYW5nZShtb2RlbENvbnRlbnQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVnaXN0ZXJFdmVudChldmVudE5hbWUsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoIWV2ZW50TmFtZSB8fCAhY2FsbGJhY2spIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGhpcy5fb3B0cy5ldmVudHMpIHtcclxuICAgICAgdGhpcy5fb3B0cy5ldmVudHMgPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9vcHRzLmV2ZW50c1tldmVudE5hbWVdID0gY2FsbGJhY2s7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGluaXRMaXN0ZW5lcnMoKSB7XHJcbiAgICBsZXQgc2VsZiA9IHRoaXM7XHJcbiAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIGV2ZW50cyBvbiB0aGUgZWRpdG9yLlxyXG4gICAgaWYgKHRoaXMuX2VkaXRvci5ldmVudHMpIHtcclxuICAgICAgLy8gYmluZCBjb250ZW50Q2hhbmdlIGFuZCBrZXl1cCBldmVudCB0byBmcm9hbGFNb2RlbFxyXG4gICAgICB0aGlzLl9lZGl0b3IuZXZlbnRzLm9uKCdjb250ZW50Q2hhbmdlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzZWxmLnVwZGF0ZU1vZGVsKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgICB0aGlzLl9lZGl0b3IuZXZlbnRzLm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBzZWxmLm9uVG91Y2hlZCgpO1xyXG4gICAgICAgIH0sIDApO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICh0aGlzLl9vcHRzLmltbWVkaWF0ZUFuZ3VsYXJNb2RlbFVwZGF0ZSkge1xyXG4gICAgICAgIHRoaXMuX2VkaXRvci5ldmVudHMub24oJ2tleXVwJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNlbGYudXBkYXRlTW9kZWwoKTtcclxuICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fZWRpdG9ySW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVFZGl0b3IoKSB7XHJcbiAgICBpZiAodGhpcy5fZWRpdG9ySW5pdGlhbGl6ZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc2V0Q29udGVudCh0cnVlKTtcclxuXHJcbiAgICAvLyBpbml0IGVkaXRvclxyXG4gICAgdGhpcy56b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcclxuICAgICAgLy8gQWRkIGxpc3RlbmVycyBvbiBpbml0aWFsaXplZCBldmVudC5cclxuICAgICAgaWYgKCF0aGlzLl9vcHRzLmV2ZW50cykgdGhpcy5fb3B0cy5ldmVudHMgPSB7fTtcclxuXHJcbiAgICAgIC8vIFJlZ2lzdGVyIGluaXRpYWxpemVkIGV2ZW50LlxyXG4gICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoJ2luaXRpYWxpemVkJywgdGhpcy5fb3B0cy5ldmVudHMgJiYgdGhpcy5fb3B0cy5ldmVudHMuaW5pdGlhbGl6ZWQpO1xyXG4gICAgICBjb25zdCBleGlzdGluZ0luaXRDYWxsYmFjayA9IHRoaXMuX29wdHMuZXZlbnRzLmluaXRpYWxpemVkO1xyXG4gICAgICAvLyBEZWZhdWx0IGluaXRpYWxpemVkIGV2ZW50LlxyXG4gICAgICBpZiAoIXRoaXMuX29wdHMuZXZlbnRzLmluaXRpYWxpemVkIHx8ICF0aGlzLl9vcHRzLmV2ZW50cy5pbml0aWFsaXplZC5vdmVycmlkZGVuKSB7XHJcbiAgICAgICAgdGhpcy5fb3B0cy5ldmVudHMuaW5pdGlhbGl6ZWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLmluaXRMaXN0ZW5lcnMoKTtcclxuICAgICAgICAgIGV4aXN0aW5nSW5pdENhbGxiYWNrICYmIGV4aXN0aW5nSW5pdENhbGxiYWNrLmNhbGwodGhpcy5fZWRpdG9yLCB0aGlzKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuX29wdHMuZXZlbnRzLmluaXRpYWxpemVkLm92ZXJyaWRkZW4gPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJbml0aWFsaXplIHRoZSBGcm9hbGEgRWRpdG9yLlxyXG4gICAgICB0aGlzLl9lZGl0b3IgPSBuZXcgRnJvYWxhRWRpdG9yKFxyXG4gICAgICAgIHRoaXMuX2VsZW1lbnQsXHJcbiAgICAgICAgdGhpcy5fb3B0c1xyXG4gICAgICApO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNldEh0bWwoKSB7XHJcbiAgICB0aGlzLl9lZGl0b3IuaHRtbC5zZXQodGhpcy5fbW9kZWwgfHwgXCJcIik7XHJcblxyXG4gICAgLy8gVGhpcyB3aWxsIHJlc2V0IHRoZSB1bmRvIHN0YWNrIGV2ZXJ5dGltZSB0aGUgbW9kZWwgY2hhbmdlcyBleHRlcm5hbGx5LiBDYW4gd2UgZml4IHRoaXM/XHJcbiAgICB0aGlzLl9lZGl0b3IudW5kby5yZXNldCgpO1xyXG4gICAgdGhpcy5fZWRpdG9yLnVuZG8uc2F2ZVN0ZXAoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2V0Q29udGVudChmaXJzdFRpbWUgPSBmYWxzZSkge1xyXG4gICAgbGV0IHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIC8vIFNldCBpbml0aWFsIGNvbnRlbnRcclxuICAgIGlmICh0aGlzLl9tb2RlbCB8fCB0aGlzLl9tb2RlbCA9PSAnJykge1xyXG4gICAgICB0aGlzLl9vbGRNb2RlbCA9IHRoaXMuX21vZGVsO1xyXG4gICAgICBpZiAodGhpcy5faGFzU3BlY2lhbFRhZykge1xyXG5cclxuICAgICAgICBsZXQgdGFnczogT2JqZWN0ID0gdGhpcy5fbW9kZWw7XHJcblxyXG4gICAgICAgIC8vIGFkZCB0YWdzIG9uIGVsZW1lbnRcclxuICAgICAgICBpZiAodGFncykge1xyXG5cclxuICAgICAgICAgIGZvciAobGV0IGF0dHIgaW4gdGFncykge1xyXG4gICAgICAgICAgICBpZiAodGFncy5oYXNPd25Qcm9wZXJ0eShhdHRyKSAmJiBhdHRyICE9IHRoaXMuSU5ORVJfSFRNTF9BVFRSKSB7XHJcbiAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ciwgdGFnc1thdHRyXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAodGFncy5oYXNPd25Qcm9wZXJ0eSh0aGlzLklOTkVSX0hUTUxfQVRUUikpIHtcclxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudC5pbm5lckhUTUwgPSB0YWdzW3RoaXMuSU5ORVJfSFRNTF9BVFRSXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKGZpcnN0VGltZSkge1xyXG4gICAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KCdpbml0aWFsaXplZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5zZXRIdG1sKCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgc2VsZi5zZXRIdG1sKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGRlc3Ryb3lFZGl0b3IoKSB7XHJcbiAgICBpZiAodGhpcy5fZWRpdG9ySW5pdGlhbGl6ZWQpIHtcclxuICAgICAgdGhpcy5fZWRpdG9yLmRlc3Ryb3koKTtcclxuICAgICAgdGhpcy5fZWRpdG9ySW5pdGlhbGl6ZWQgPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0RWRpdG9yKCkge1xyXG4gICAgaWYgKHRoaXMuX2VsZW1lbnQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuX2VkaXRvcjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIC8vIHNlbmQgbWFudWFsIGVkaXRvciBpbml0aWFsaXphdGlvblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVNYW51YWxDb250cm9sbGVyKCkge1xyXG4gICAgbGV0IGNvbnRyb2xzID0ge1xyXG4gICAgICBpbml0aWFsaXplOiB0aGlzLmNyZWF0ZUVkaXRvci5iaW5kKHRoaXMpLFxyXG4gICAgICBkZXN0cm95OiB0aGlzLmRlc3Ryb3lFZGl0b3IuYmluZCh0aGlzKSxcclxuICAgICAgZ2V0RWRpdG9yOiB0aGlzLmdldEVkaXRvci5iaW5kKHRoaXMpLFxyXG4gICAgfTtcclxuICAgIHRoaXMuZnJvYWxhSW5pdC5lbWl0KGNvbnRyb2xzKTtcclxuICB9XHJcblxyXG4gIC8vIFRPRE8gbm90IHN1cmUgaWYgbmdPbkluaXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgQGlucHV0c1xyXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcclxuICAgIC8vIGNoZWNrIGlmIG91dHB1dCBmcm9hbGFJbml0IGlzIHByZXNlbnQuIE1heWJlIG9ic2VydmVycyBpcyBwcml2YXRlIGFuZCBzaG91bGQgbm90IGJlIHVzZWQ/PyBUT0RPIGhvdyB0byBiZXR0ZXIgdGVzdCB0aGF0IGFuIG91dHB1dCBkaXJlY3RpdmUgaXMgcHJlc2VudC5cclxuICAgIGlmICghdGhpcy5mcm9hbGFJbml0Lm9ic2VydmVycy5sZW5ndGgpIHtcclxuICAgICAgdGhpcy5jcmVhdGVFZGl0b3IoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuZ2VuZXJhdGVNYW51YWxDb250cm9sbGVyKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBuZ09uRGVzdHJveSgpIHtcclxuICAgIHRoaXMuZGVzdHJveUVkaXRvcigpO1xyXG4gIH1cclxuXHJcbiAgc2V0RGlzYWJsZWRTdGF0ZShpc0Rpc2FibGVkOiBib29sZWFuKTogdm9pZCB7XHJcbiAgfVxyXG59XHJcbiJdfQ==