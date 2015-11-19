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
var events = require( 'events' ) ;
var path = require( 'path' ) ;

var dbus = require( 'dbus-native' ) ;



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
var appName = 'nodejs' ;



notifications.init = function init( callback )
{
	if ( isInit ) { callback() ; return ; }
	if ( initInProgress ) { notifications.once( 'ready' , callback ) ; return ; }
	
	initInProgress = true ;
	notifications.setMaxListeners( Infinity ) ;
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



// Useful?
notifications.reset = function reset()
{
	interface.removeListener( 'ActionInvoked' , onAction ) ;
	interface.removeListener( 'NotificationClosed' , onClose ) ;
	initInProgress = false ;
	isInit = false ;
	
	// Looks like this is not a true event emitter, so it's not possible to call .removeAllListeners()
	//interface.removeAllListeners() ;
} ;



notifications.setAppName = function setAppName( appName_ )
{
	if ( appName_ && typeof appName_ === 'string' ) { appName = appName_ ; }
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
	//console.log( "'NotificationClosed' event on #%d: %s" , id , code ) ;
	notifications.emit( 'close' , id , closedBy[ code ] ) ;
}



notifications.getCapabilities = function getCapabilities( callback )
{
	if ( ! isInit ) { notifications.init( notifications.getCapabilities.bind( notifications , callback ) ) ; return ; }
	
	interface.GetCapabilities( function( error , capabilities ) {
		//console.log( "Capabilities:" , capabilities ) ;
		callback( error , capabilities ) ;
	} ) ;
} ;



notifications.getServerInfo = function getServerInfo( callback )
{
	if ( ! isInit ) { notifications.init( notifications.getServerInfo.bind( notifications , callback ) ) ; return ; }
	
	interface.GetServerInformation( function( error , name , vendor , version , specVersion ) {
		if ( error ) { callback( error ) ; return ; }
		callback( undefined , {
			name: name ,
			vendor: vendor ,
			version: version ,
			specVersion: specVersion
		} ) ;
	} ) ;
} ;



function Notification( data ) { return notifications.createNotification( data ) ; }
notifications.Notification = Notification ;
Notification.prototype = Object.create( events.prototype ) ;
Notification.prototype.constructor = Notification ;



notifications.createNotification = function createNotification( data )
{
	var notif = Object.create( Notification.prototype , {
		appName: { value: appName , enumerable: true , writable: true } ,
		id: { value: 0 , enumerable: true , writable: true } ,
		icon: { value: '' , enumerable: true , writable: true } ,
		summary: { value: '' , enumerable: true , writable: true } ,
		body: { value: '' , enumerable: true , writable: true } ,
		actions: { value: [] , enumerable: true , writable: true } ,
		timeout: { value: 0 , enumerable: true , writable: true } ,
		antiLeakTimeout: { value: null , enumerable: true , writable: true } ,
		hints: { value: {} , enumerable: true , writable: true } ,
		onAction: { value: onNotificationAction.bind( notif ) , enumerable: true , writable: true } ,
		onClose: { value: onNotificationClose.bind( notif ) , enumerable: true , writable: true } ,
		pushed: { value: false , enumerable: true , writable: true } ,
		closed: { value: false , enumerable: true , writable: true } ,
		closedBy: { value: null , enumerable: true , writable: true } ,
		cleaned: { value: false , enumerable: true , writable: true } ,
		timer: { value: null , enumerable: true , writable: true }
	} ) ;
	
	notif.onAction = onNotificationAction.bind( notif ) ;
	notif.onClose = onNotificationClose.bind( notif ) ;
	
	notif.on( 'newListener' , onNewListener.bind( notif ) ) ;
	notif.on( 'removeListener' , onRemoveListener.bind( notif ) ) ;
	
	notif.pushed = false ;
	
	notif.set( data ) ;
	
	return notif ;
} ;



var urgencyName = {
	low: 0 ,
	normal: 1 ,
	critical: 2
} ;



Notification.prototype.set = function set( data )
{
	var k ;
	
	if ( typeof data.urgency === 'string' ) { data.urgency = urgencyName[ data.urgency ] ; }
	if ( data.actions && Object.keys( data.actions ).length > 0 && data.urgency === undefined ) { data.urgency = 2 ; }
	
	if ( data.sound )
	{
		if ( data.sound.indexOf( path.sep ) === -1 ) { data['sound-name'] = data.sound ; }
		else { data['sound-file'] = data.sound ; }
	}
	
	for ( k in data )
	{
		if ( data[ k ] === undefined ) { continue ; }
		
		switch ( k )
		{
			case 'appName' :
			case 'icon' :
			case 'summary' :
			case 'body' :
			case 'actions' :
			case 'timeout' :
			case 'antiLeakTimeout' :
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
	
	if ( ! isInit ) { notifications.init( this.push.bind( this , callback ) ) ; return ; }
	
	interface.Notify(
		this.appName ,
		this.id ,
		this.icon ,
		this.summary ,
		this.body ,
		notifications.toPairs( this.actions ) ,
		notifications.toDict( this.hints ) ,
		this.timeout ,
		
		function( error , id ) {
			
			var timeout ;
			
			if ( error )
			{
				//console.log( error ) ;
				if ( callback ) { callback( error ) ; }
				//self.emit( error ) ;
				return ;
			}
			
			//console.log( "pushed ID:" , id ) ;
			self.id = id ;
			self.pushed = true ;
			
			// Default to 30 seconds low and normal priority or 10 minutes for critical priority
			timeout = self.antiLeakTimeout || ( self.hints.urgency === 2 ? 600000 : 30000 ) ;
			
			self.timer = setTimeout( self.close.bind( self , 'antiLeak' ) , timeout ) ;
			
			if ( callback ) { callback() ; }
		}
	) ;
} ;



function onNotificationAction( id , action )
{
	if ( id !== this.id ) { return ; }
	
	notifications.removeListener( 'action' , this.onAction ) ;
	this.emit( 'action' , action ) ;
} ;



function onNotificationClose( id , closedBy )
{
	if ( id !== this.id || this.closed ) { return ; }
	this.closed = true ;
	
	notifications.removeListener( 'close' , this.onClose ) ;
	this.emit( 'close' , this.closedBy || closedBy ) ;
	this.cleanup() ;
} ;



function onNewListener( event , fn )
{
	switch ( event )
	{
		case 'action' :
			if ( this.listenerCount( 'action' ) === 0 )
			{
				//console.log( "Adding a global Notifications listener for 'action'" ) ;
				notifications.on( 'action' , this.onAction ) ;
			}
			break ;
		
		case 'close' :
			if ( this.listenerCount( 'close' ) === 0 )
			{
				//console.log( "Adding a global Notifications listener for 'close'" ) ;
				notifications.on( 'close' , this.onClose ) ;
			}
			break ;
	}
} ;



function onRemoveListener( event , fn )
{
	switch ( event )
	{
		case 'action' :
			if ( this.listenerCount( 'action' ) === 0 )
			{
				//console.log( "Removing the global Notifications listener for 'action'" ) ;
				notifications.removeListener( 'action' , this.onAction ) ;
			}
			break ;
		
		case 'close' :
			if ( this.listenerCount( 'close' ) === 0 )
			{
				//console.log( "Removing the global Notifications listener for 'close'" ) ;
				notifications.removeListener( 'close' , this.onClose ) ;
			}
			break ;
	}
} ;



Notification.prototype.close = function close( closedBy )
{
	var self = this ;
	
	if ( this.closed ) { return ; }
	if ( ! isInit ) { notifications.init( this.close.bind( this ) ) ; return ; }
	
	if ( closedBy ) { this.closedBy = closedBy ; }
	
	interface.CloseNotification( this.id , function( error ) {
		
		// Most of time this code run AFTER the 'close' event listeners
		
		//console.log( "CloseNotification:" , arguments ) ;
		self.cleanup() ;
	} ) ;
} ;



Notification.prototype.cleanup = function cleanup()
{
	if ( this.cleaned ) { return ; }
	this.cleaned = true ;
	
	//console.log( "Cleanup" ) ;
	
	if ( this.timer )
	{
		clearTimeout( this.timer ) ;
		this.timer = null ;
	}
	
	if ( ! this.closed )
	{
		this.emit( 'close' , this.closedBy || 'client' ) ;
		this.closed = true ;
	}
	
	this.removeAllListeners() ;
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

