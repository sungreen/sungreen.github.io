import Controller from './Controller.js';

export default class PlayerController extends Controller {

	constructor( parent, object, property ) {
		super( parent, object, property, 'function' );
		if( this.$name ) this.$name.remove();
		this.updateDisplay();
	}

	updateDisplay() {
		const content = this.getValue();
		if( content ) {
			if( this.$content ) this.$content.remove();
			switch ( content.type ) {
			case 'image':
				this.$content = content.data; 
				this.$content.setAttribute( 'width', '100%');
				this.$widget.appendChild( this.$content );
				break;
			case 'video':
				this.$content = content.data;
				this.$content.setAttribute( 'width', '100%');
				this.$widget.appendChild( this.$content );
				break;
			}
		}
		return this;
	}
}