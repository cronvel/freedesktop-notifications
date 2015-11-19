/*
	The Cedric's Swiss Knife (CSK) - CSK Freedesktop Notifications

	Copyright (c) 2015 Cédric Ronvel 
	
	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/



// Load modules
var dbus = require( 'dbus-native' ) ;
var events = require( 'events' ) ;



/*
	Freedesktop.org Notifications spec:
	https://developer.gnome.org/notification-spec/
*/



var notifications = Object.create( events.prototype ) ;
module.exports = notifications ;



var isInit = false ;
var initInProgress = false ;
var sessionBus ;
var interface ;



notifications.init = function init( callback )
{
	if ( isInit ) { callback() ; return ; }
	if ( initInProgress ) { notifications.once( 'ready' , callback ) ; return ; }
	
	initInProgress = true ;
	sessionBus = dbus.sessionBus() ;
	
	sessionBus
		.getService( 'org.freedesktop.Notifications' )
		.getInterface(
			'/org/freedesktop/Notifications',
			'org.freedesktop.Notifications',
			function( error , interface_ ) {
				if ( error ) { callback( error ) ; return ; }
				interface = interface_ ;
				
				interface.on( 'ActionInvoked' , onAction ) ;
				interface.on( 'NotificationClosed' , onClose ) ;
				
				isInit = true ;
				
				// Callback first: most of time it contains the action that trigger the init in the first place
				callback() ;
				notifications.emit( 'ready' ) ;
			}
		) ;
} ;



function onAction( id , action )
{
	//console.log( "'ActionInvoked' event on #%d: %s" , id , action ) ;
	notifications.emit( 'action' , id , action ) ;
}



var closedBy = [
	'' ,
	'timeout' ,
	'user' ,
	'client' ,
	'reserved'
] ;



function onClose( id , code )
{
	console.log( "'NotificationClosed' event on #%d: %s" , id , code ) ;
	notifications.emit( 'close' , id , closedBy[ code ] ) ;
}



notifications.getCapabilities = function getCapabilities( callback )
{
	interface.GetCapabilities( function( error , caps ) {
		console.log( "Caps:" , caps ) ;
		callback( error , caps ) ;
	} ) ;
} ;



function Notification( data ) { return notifications.createNotification( data ) ; }
notifications.Notification = Notification ;
Notification.prototype = Object.create( events.prototype ) ;
Notification.prototype.constructor = Notification ;



notifications.createNotification = function createNotification( data )
{
	var notif = Object.create( Notification.prototype , {
		appName: { value: 'node' , enumerable: true , writable: true } ,
		id: { value: 0 , enumerable: true , writable: true } ,
		iconPath: { value: '' , enumerable: true , writable: true } ,
		summary: { value: '' , enumerable: true , writable: true } ,
		body: { value: '' , enumerable: true , writable: true } ,
		actions: { value: [] , enumerable: true , writable: true } ,
		timeout: { value: 0 , enumerable: true , writable: true } ,
		hints: { value: {} , enumerable: true , writable: true } ,
		onAction: { value: onNotificationAction.bind( notif ) , enumerable: true , writable: true } ,
		onClose: { value: onNotificationClose.bind( notif ) , enumerable: true , writable: true } ,
		pushed: { value: false , enumerable: true , writable: true }
	} ) ;
	
	notif.appName = data.appName || 'node' ; delete data.appName ;
	notif.id = 0 ; delete data.id ;
	notif.iconPath = data.iconPath || '' ; delete data.iconPath ;
	notif.summary = data.summary || '' ; delete data.summary ;
	notif.body = data.body || '' ; delete data.body ;
	notif.actions = data.actions || [] ; delete data.actions ;
	notif.timeout = data.timeout || 0 ; delete data.timeout ;
	notif.hints = data ;
	
	notif.onAction = onNotificationAction.bind( notif ) ;
	notif.onClose = onNotificationClose.bind( notif ) ;
	
	notif.pushed = false ;
	
	notif.set( data ) ;
	
	return notif ;
} ;



Notification.prototype.set = function set( data )
{
	for ( k in data )
	{
		switch ( k )
		{
			case 'appName' :
			case 'iconPath' :
			case 'summary' :
			case 'body' :
			case 'actions' :
			case 'timeout' :
				this[ k ] = data[ k ] ;
				break ;
			default :
				if ( data[ k ] === null ) { delete this.hints[ k ] ; }
				else { this.hints[ k ] = data[ k ] ; }
				break ;
		}
	}
} ;



Notification.prototype.push = function push( callback )
{
	var self = this ;
	
	if ( ! isInit ) { notifications.init( this.push.bind( this ) ) ; return ; }
	
	interface.Notify(
		this.appName ,
		this.id ,
		this.iconPath ,
		this.summary ,
		this.body ,
		notifications.toPairs( this.actions ) ,
		notifications.toDict( this.hints ) ,
		this.timeout ,
		
		function( error , id ) {
			
			if ( error )
			{
				console.log( error ) ;
				if ( callback ) { callback() ; }
				//self.emit( error ) ;
				return ;
			}
			
			if ( ! self.pushed )
			{
				console.log( "pushed ID:" , id ) ;
				self.id = id ;
				notifications.on( 'action' , self.onAction ) ;
				notifications.on( 'close' , self.onClose ) ;
				self.pushed = true ;
			}
			
			if ( callback ) { callback() ; }
		}
	) ;
} ;



function onNotificationAction( id , action )
{
	if ( id !== this.id ) { return ; }
	
	notifications.removeListener( 'action' , this.onAction ) ;
	//notifications.removeListener( 'close' , this.onClose ) ;
	this.emit( 'action' , action ) ;
} ;



function onNotificationClose( id , code )
{
	if ( id !== this.id ) { return ; }
	
	notifications.removeListener( 'action' , this.onAction ) ;
	notifications.removeListener( 'close' , this.onClose ) ;
	this.emit( 'close' , code ) ;
} ;



Notification.prototype.close = function close()
{
	var self = this ;
	
	if ( ! isInit ) { notifications.init( this.push.bind( this ) ) ; return ; }
	
	interface.CloseNotification( this.id , function( error ) {
		//console.log( "CloseNotification:" , arguments ) ;
	} ) ;
} ;





			/* Helpers */



// Non-nested object/dict
notifications.toDict = function toDict( object )
{
	var k , type , dict = [] ;
	
	for ( k in object )
	{
		switch ( typeof object[ k ] )
		{
			case 'string' :
				type = 's' ;
				break ;
			case 'number' :
				if ( object[ k ] === Math.floor( object[ k ] ) ) { type = 'i' ; }
				else { type = 'd' ; }
				break ;
			case 'boolean' :
				type = 'b' ;
				break ;
			default :
				continue ;
		}
		
		dict.push( [ k , [ type , object[ k ] ] ] ) ;
	}
	
	return dict ;
} ;



notifications.toPairs = function toPairs( object )
{
	var k , pairs = [] ;
	
	for ( k in object )
	{
		pairs.push( k ) ;
		pairs.push( object[ k ] ) ;
	}
	
	return pairs ;
} ;

