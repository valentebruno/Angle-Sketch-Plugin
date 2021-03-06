import Angle from './Angle'
import * as Shared from './Shared'

import { Error } from './Error'

export default function (context) {

    let selectedLayersNSArray = context.selection;
    
    if (selectedLayersNSArray == null) {
        let error = Error.emptySelection
        Shared.showMessage_inContext(Error.message, context);
        return
    }
    
    let selectedLayers = Array.fromNSArray(selectedLayersNSArray);

    if (selectedLayers.length == 0) {
        let error = Error.emptySelection
        Shared.showMessage_inContext(Error.message, context);
        return
    }

    let possibleAngles = Angle.forSelectedLayers_inContext(selectedLayers,context);

    let angles = possibleAngles.filter( a => a instanceof Angle );
    let errors = possibleAngles.filter( a => !(a instanceof Angle) );

    // if (!((angleInstance = getAngle(options)) instanceof Angle)) {
    if (angles.length == 0) {
        let error = errors[0];
        Shared.showMessage_inContext(Error.message, context);
        return
    }

    angles.forEach( a => {
        a.rotate();
        a.applyImage();
    });

    Shared.showMessage_inContext("Angle rotated! 🔄", context);

    return
}
