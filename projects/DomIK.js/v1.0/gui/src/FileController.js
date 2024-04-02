import Controller from './Controller.js';

export default class FileController extends Controller {

	constructor( parent, object, property ) {

		super( parent, object, property, 'string' );

		this.$button = document.createElement( 'button' );
		this.$widget.appendChild( this.$button );
		this.$button.innerHTML = '... add image/video ...';

		this.$input = document.createElement( 'input' );
		this.$input.setAttribute( 'type', 'file' );
		this.$input.setAttribute( 'style', 'display:none' );

		this.$button.addEventListener(
			'click',
			e => { if ( this.$input ) {	this.$input.click(); }},
			false
		);

		this.$input.addEventListener(
			'change',
			() => {
				this.object[ this.property ] = null;
				const file = this.$input.files[0];
				const len = file.name.length;
				const num = 10;
				const label = len<num*2 ? file.name : file.name.substring(0,num) + " ... " + file.name.substring(len-num+1, len);
				this.$button.innerHTML = label;
				this.order( file );
			},
			false
		);
		this.updateDisplay();
	}

	onLoadContent( file, type, data ) {
		this.setValue( { file:file, type:type, data:data } );
	}

	order( file ) {
		const type = file.type.replace(/\/.+/, "");
		switch ( type ) {
		case 'image':
			const img  = new Image();
			img.onload = () => { this.onLoadContent( file, type, img ); }
			img.src = URL.createObjectURL( file );
			break;
		case 'video':
			const video = document.createElement( 'video' );
			video.setAttribute( 'controls', '' );
			video.setAttribute( 'loop', 'true');
			video.src = URL.createObjectURL( file );
			this.onLoadContent( file, type, video );
			video.play();
			URL.revokeObjectURL(video);
			break;
		}
	}

	accept( accept ) {
		this.$input.setAttribute( 'accept', accept );
	}

	updateDisplay() {
		return this;
	}

}