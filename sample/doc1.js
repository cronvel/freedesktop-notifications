
var notifications = require( '../lib/notifications.js' ) ;

notifications.createNotification( {
	summary: 'Hello world!' ,
	body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
	icon: 'appointment-new' ,
} ).push() ;
