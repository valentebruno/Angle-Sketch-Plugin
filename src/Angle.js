class Angle {

    // ---------------------------------
    // PERSISTENT PROPERTIES
    // ---------------------------------

    get artboardID () {
        if (this._artboardID != undefined) { return this._artboardID; }
        
        // Javascript string cohersion
        this._artboardID = this.loadValueForKey("artboard-id") + "";

        return this._artboardID;
    }
    set artboardID (value) { return }

    get artboard () {
        if (this._artboard != undefined) { return this._artboard; }

        if (this.artboardID == undefined) {
            print("🛑 No artboard ID registered");
            return
        }

        let artboards = this.context.document.artboards();

        for (let index = 0; index < artboards.count(); index++) {
            if (artboards[index].objectID() == this.artboardID) {
                this._artboard = artboards[index];
            }
        }

        if (this._artboard == undefined) {
            print("🛑 Not able to retrieve artboard from id in document");
            return
        }

        return this._artboard
    }

    set artboard (value) {
        this._artboard = value;
        this.imprintValue_forKey(value.objectID(), "artboard-id");
    }

    get rotation () {
        if (this._rotation == undefined) {
            this._rotation = this.loadValueForKey("rotation");
        }
        return this._rotation;
    }
    set rotation (value) {
        this._rotation = value;
        this.imprintValue_forKey(value, "rotation");
    }

    get pixelDensity () {
        if (this._pixelDensity == undefined) {
            this._pixelDensity = this.loadValueForKey("pixel-density") + 0;
        }

        if (this._pixelDensity == 0) {
            return this.estimatePixelDensity();
        }

        return this._pixelDensity;
    }
    set pixelDensity (value) {
        this._pixelDensity = value;
        this.imprintValue_forKey(value, "pixel-density");
    }

    get reversed () {
        if (this._reversed == undefined) {
            // Javascript boolean cohersion
            this._reversed = this.loadValueForKey("reversed") == 1 ? true : false;
        }
        return this._reversed;
    }
    set reversed (value) {
        this._reversed = value;
        this.imprintValue_forKey(value, "reversed");
    }

    // ---------------------------------
    // PERSISTENCY METHODS
    // ---------------------------------

    imprintValue_forKey(value, key) {
        if (this.selectedLayer == null) {
            print("🛑 Imprinting value before selected layer assignment");
            return
        }

        this.context.command.setValue_forKey_onLayer(value, key, this.selectedLayer);

        print("☑️ Persistent data imprinted into layer: " + key);
        print("Value: " + value);
    }

    imprintValues_forKeys(dictionary) {
        for (let [key, value] of Object.entries(dictionary)) {
            this.imprintValue_forKey(key, dictionary[key]);
        }
    }

    loadValueForKey(key) {
        let value = this.context.command.valueForKey_onLayer(key, this.selectedLayer);
        print("☑️ Persistent data loadad from layer: " + key);
        print("Value: " + value);
        return value
    }

    // ---------------------------------
    // CONSTRUCTOR
    // ---------------------------------

    constructor (options = {}) {

        this.context = options.context;
        this.selectedLayer = options.selectedLayer;

        options.rotation = options.rotation || 0;
        options.reversed = options.reversed || false;
        
        this.rotation = this.rotation || options.rotation;
        this.reversed = this.reversed || options.reversed;
    }

    // ---------------------------------
    // IMAGE DATA
    // ---------------------------------

    get imageData () {

        let layerAncestry = MSImmutableLayerAncestry.alloc().initWithMSLayer(this.artboard);      
        let exportFormat = MSExportFormat.formatWithScale_name_fileFormat(this.pixelDensity, "Angle", "png");
        let exportRequest = MSExportRequest.exportRequestsFromLayerAncestry_exportFormats(layerAncestry, [exportFormat]).firstObject();
        let exporter = MSExporter.exporterForRequest_colorSpace(exportRequest, NSColorSpace.sRGBColorSpace());
        let imageData = exporter.bitmapImageRep().TIFFRepresentation();

        if (imageData == undefined) {
            print("🛑 Unable to retrieve image data");
        } else {
            print("🖼 Image data retrieved");
        }

        return imageData
    }

    // ---------------------------------
    // PATH
    // ---------------------------------

    get pointsAreValid () {
        let points = this.pointsFromBezierPath;
        let length = points.length;

        if (length != 7) { // Not a quadrilater

            if (length > 7) {
            context.document.showMessage("Maybe your shape has too many sides.");
            return false
            }
        
            if (length < 7) {
            context.document.showMessage("Maybe your shape does not have enought sides.");
            return false
            }
        }

        // If the shape is an X crossing shape, fail
        // If two or more points coincide, fail

        // There seems to be something wrong with your shape 😕

        return true
    }

    get pointsFromBezierPath () {

        if (this._pointsFromBezierPath != undefined) {
            return this._pointsFromBezierPath;
        }

        let count = this.targetPath.elementCount();

        let array = Array.from({ length: count }, (x, i) => i);

        let points = array.map(
            (a, i, as) => {
            var pointsPointer = MOPointer.alloc().initWithValue_(CGPointMake(0, 0));
            var element = this.targetPath.elementAtIndex_associatedPoints_(i, pointsPointer);

            let point = pointsPointer.value();

            return point
            }
        );

        this._pointsFromBezierPath = points;

        return points;
    }

    verticesLengths () {

        let points = this.pointsFromBezierPath;

        let verticesLengths = Array.from({ length: 4 }, (x, i) => i).map(function (a, i, as) {
            let width = points[i].x - points[(i + 1) % 4].x;
            let height = points[i].y - points[(i + 1) % 4].y;
            return Math.sqrt( Math.pow(width, 2) + Math.pow(height, 2) )
        });

        return verticesLengths;
    }

    maximumVerticesWidthAndHeight () {

        let verticesLengths = this.verticesLengths();
        
        let layerWidth, layerHeight;
        
        if (this.rotation % 2 == 0) {
            layerWidth = verticesLengths[0] > verticesLengths[2] ? verticesLengths[0] : verticesLengths[2];
            layerHeight = verticesLengths[1] > verticesLengths[3] ? verticesLengths[1] : verticesLengths[3];
        } else {
            layerWidth = verticesLengths[1] > verticesLengths[3] ? verticesLengths[1] : verticesLengths[3];
            layerHeight = verticesLengths[0] > verticesLengths[2] ? verticesLengths[0] : verticesLengths[2];
        }

        return [layerWidth, layerHeight];
    }

    get normalizedCIVectors () {

        let points = this.pointsFromBezierPath;

        let minimumX = points.reduce(((p, a, i, as) => p > a.x ? a.x : p), points[0].x);
        let minimumY = points.reduce(((p, a, i, as) => p > a.y ? a.y : p), points[0].y);
        let maximumY = points.reduce(((p, a, i, as) => p < a.y ? a.y : p), points[0].y);

        let pixelDensity = this.pixelDensity;
    
        return points.map(
            function (a, i, as) {
                let xValue = minimumX >= 0 ? a.x - minimumX : a.x + minimumX;
                let yValue = minimumY >= 0 ? a.y - minimumY : a.y + minimumY;
                let vector = CIVector.vectorWithX_Y(
                    xValue * pixelDensity,
                    (maximumY - minimumY - yValue) * pixelDensity);
    
                return vector;
        });
    }

    // ---------------------------------
    // INTERFACE
    // ---------------------------------

    rotate () {

        this.rotation = (this.rotation + (this.reversed ? 1 : 3))%4;
    }

    reverseSimmetry () {

        this.rotation = (this.rotation + (this.reversed ? 1 : 3))%4;

        this.reversed = !this.reversed;
    }

    // ---------------------------------
    // DRAWING
    // ---------------------------------

    mappedIndexFor (index) {

        if (this.reversed) {
            return [0,3,2,1][(index + this.rotation) % 4];
        }
        return (index + this.rotation) % 4;
    }

    lossyCompressionOfImage_atRate(image, rate) {

        let representation = NSBitmapImageRep.alloc().initWithCIImage(image);
        let properties = NSMutableDictionary.dictionary();

        properties.setObject_forKey(NSTIFFCompressionJPEG, NSImageCompressionMethod);
        properties.setObject_forKey(rate, NSImageCompressionFactor);
        properties.setObject_forKey(NSColor.whiteColor(), NSImageFallbackBackgroundColor);

        let compressed = representation.representationUsingType_properties(NSJPEGFileType, properties);
        let nsImage = NSImage.alloc().initWithData(compressed);

        return nsImage;
    }

    pixelAccurateRepresentationOfImage(image) {

        let representation = NSCIImageRep.imageRepWithCIImage(image);
        let nsImage = NSImage.alloc().initWithSize(representation.size());
        nsImage.addRepresentation(representation);
    
        return nsImage
    }

    get transformedImage () {

        let vectors = this.normalizedCIVectors;

        let perspectiveTransform = CIFilter.filterWithName("CIPerspectiveTransform");
        
        perspectiveTransform.setValue_forKey(vectors[this.mappedIndexFor(0)], "inputTopLeft");
        perspectiveTransform.setValue_forKey(vectors[this.mappedIndexFor(1)], "inputTopRight");
        perspectiveTransform.setValue_forKey(vectors[this.mappedIndexFor(2)], "inputBottomRight");
        perspectiveTransform.setValue_forKey(vectors[this.mappedIndexFor(3)], "inputBottomLeft");
    
        let imageBitmap = NSBitmapImageRep.imageRepWithData(this.imageData);
        let image = CIImage.alloc().initWithBitmapImageRep(imageBitmap);
    
        perspectiveTransform.setValue_forKey(image, "inputImage");
    
        let perspectiveImage = perspectiveTransform.valueForKey("outputImage");
    
        if (!perspectiveImage) {
            print("🛑 Unable to form perspective image");
            return
        }

        let ouputNSImage;

        if (false) {
            ouputNSImage = this.lossyCompressionOfImage_atRate(perspectiveImage, 0.4);
        } else {
            ouputNSImage = this.pixelAccurateRepresentationOfImage(perspectiveImage);
        }
    
        return MSImageData.alloc().initWithImage_(ouputNSImage)
    }
}

module.exports = Angle
