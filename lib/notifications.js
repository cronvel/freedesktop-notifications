/*
	Freedesktop.org Notifications

	Copyright (c) 2015 - 2018 Cédric Ronvel

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

"use strict" ;



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
var destroyed = false ;
var notificationsInterface ;
var appName = 'nodejs' ;
var unflood = -1 ;
var sending = false ;
var queued = 0 ;
var liveNotifications = new Set() ;	// Store pushed notifications not yet closed (or known as closed)



notifications.init = function( callback ) {
	if ( destroyed ) { return ; }
	if ( isInit ) { callback() ; return ; }
	if ( initInProgress ) { notifications.once( 'init' , callback ) ; return ; }

	//console.log( "init in progress" ) ;
	initInProgress = true ;
	notifications.setMaxListeners( Infinity ) ;
	sessionBus = dbus.sessionBus() ;

	sessionBus
		.getService( 'org.freedesktop.Notifications' )
		.getInterface(
			'/org/freedesktop/Notifications' ,
			'org.freedesktop.Notifications' ,
			( error , notificationsInterface_ ) => {
				if ( error ) { callback( error ) ; return ; }
				notificationsInterface = notificationsInterface_ ;

				notificationsInterface.on( 'ActionInvoked' , onAction ) ;
				notificationsInterface.on( 'NotificationClosed' , onClose ) ;

				initInProgress = false ;
				isInit = true ;

				// Callback first: most of time it contains the action that trigger the init in the first place
				//console.log( "init done" ) ;
				callback() ;
				notifications.emit( 'init' ) ;
			}
		) ;
} ;



notifications.destroy = function( callback ) {
	if ( destroyed ) { return ; }

	notifications.reset( () => {
		destroyed = true ;
		if ( callback ) { callback() ; }
	} ) ;
} ;



notifications.reset = function( callback ) {
	if ( destroyed ) { return ; }

	if ( ! initInProgress && ! isInit ) {
		// Nothing to do, it's not init yet
		if ( callback ) { callback() ; }
		return ;
	}


	if ( initInProgress ) {
		// Post-pone that, because it would cause stream error with the underlying D-Bus lib
		notifications.on( 'init' , () => notifications.reset( callback ) ) ;
		return ;
	}

	for ( let notification of liveNotifications ) {
		notification.destroy() ;
	}

	notificationsInterface.removeListener( 'ActionInvoked' , onAction ) ;
	notificationsInterface.removeListener( 'NotificationClosed' , onClose ) ;
	initInProgress = false ;
	isInit = false ;

	// Looks like this is not a true event emitter, so it's not possible to call .removeAllListeners()
	//notificationsInterface.removeAllListeners() ;

	if ( sessionBus ) {
		sessionBus.connection.end() ;
	}

	if ( callback ) { callback() ; }
} ;



notifications.getAppName = function() { return appName ; } ;

notifications.setAppName = function( appName_ ) {
	if ( appName_ && typeof appName_ === 'string' ) { appName = appName_ ; }
} ;



notifications.getUnflood = function() { return unflood ; } ;

notifications.setUnflood = function( v ) {
	switch ( v ) {
		case undefined :
		case false :
		case null :
			unflood = -1 ;
			break ;
		case true :
			unflood = 0 ;
			break ;
		default :
			unflood = typeof v !== 'number' ? -1 : v ;
	}
} ;



notifications.purge = function() {
	unflood = -1 ;
	notifications.emit( 'purge' ) ;
} ;



function onAction( id , action ) {
	//console.log( "'ActionInvoked' event on #%d: %s" , id , action ) ;
	notifications.emit( 'action' , id , action ) ;
}



const CLOSED_BY = [
	'' ,
	'timeout' ,
	'user' ,
	'client' ,
	'reserved'
] ;



function onClose( id , code ) {
	//console.log( "'NotificationClosed' event on #%d: %s" , id , code ) ;
	notifications.emit( 'close' , id , CLOSED_BY[ code ] ) ;
}



notifications.getCapabilities = function( callback ) {
	if ( ! isInit ) { notifications.init( notifications.getCapabilities.bind( notifications , callback ) ) ; return ; }

	notificationsInterface.GetCapabilities( ( error , capabilities ) => {
		//console.log( "Capabilities:" , capabilities ) ;
		callback( error , capabilities ) ;
	} ) ;
} ;



notifications.getServerInfo = function( callback ) {
	if ( ! isInit ) { notifications.init( notifications.getServerInfo.bind( notifications , callback ) ) ; return ; }

	notificationsInterface.GetServerInformation( ( error , name , vendor , version , specVersion ) => {
		if ( error ) { callback( error ) ; return ; }
		callback( undefined , {
			name: name ,
			vendor: vendor ,
			version: version ,
			specVersion: specVersion
		} ) ;
	} ) ;
} ;



function Notification( data ) {
	this.appName = appName ;
	this.id = 0 ;
	this.icon = '' ;
	this.summary = '' ;
	this.body = '' ;
	this.actions = [] ;
	this.timeout = 0 ;
	this.antiLeakTimeout = null ;
	this.hints = {} ;
	this.pushed = false ;
	this.closed = false ;
	this.closedBy = null ;
	this.cleaned = false ;
	this.timer = null ;
	this.fireAndForget = false ;

	this.onAction = onNotificationAction.bind( this ) ;
	this.onClose = onNotificationClose.bind( this ) ;

	this.on( 'newListener' , onNewListener.bind( this ) ) ;
	this.on( 'removeListener' , onRemoveListener.bind( this ) ) ;

	this.pushed = false ;

	this.set( data ) ;
}

notifications.Notification = Notification ;
Notification.prototype = Object.create( events.prototype ) ;
Notification.prototype.constructor = Notification ;



notifications.createNotification = function( data ) {
	return new Notification( data ) ;
} ;



var urgencyName = {
	low: 0 ,
	normal: 1 ,
	critical: 2
} ;



Notification.prototype.set = function( data ) {
	var k ;

	if ( typeof data.urgency === 'string' ) { data.urgency = urgencyName[ data.urgency ] ; }
	if ( data.actions && Object.keys( data.actions ).length > 0 && data.urgency === undefined ) { data.urgency = 2 ; }

	if ( data.sound ) {
		if ( data.sound.indexOf( path.sep ) === -1 ) { data['sound-name'] = data.sound ; }
		else { data['sound-file'] = data.sound ; }
	}

	for ( k in data ) {
		if ( data[ k ] === undefined ) { continue ; }

		switch ( k ) {
			case 'appName' :
			case 'icon' :
			case 'summary' :
			case 'body' :
			case 'actions' :
			case 'timeout' :
			case 'antiLeakTimeout' :
			case 'fireAndForget' :
				this[ k ] = data[ k ] ;
				break ;
			default :
				if ( data[ k ] === null ) { delete this.hints[ k ] ; }
				else { this.hints[ k ] = data[ k ] ; }
				break ;
		}
	}

	return this ;
} ;



Notification.prototype.push = function( callback ) {
	var emitReady = false , readyTimeout , onReady , onReadyTimer , onPurge ;

	if ( destroyed ) { return this ; }
	if ( ! isInit ) { notifications.init( this.push.bind( this , callback ) ) ; return this ; }

	//console.log( "Queued:" , queued ) ;

	if ( unflood >= 0 ) {
		if ( sending || queued ) {
			queued ++ ;
			readyTimeout = unflood * queued ;

			onReady = () => {
				queued -- ;
				onReadyTimer = setTimeout( () => {
					notifications.removeListener( 'purge' , onPurge ) ;
					this.push( callback ) ;
				} , readyTimeout
				) ;
			} ;

			onPurge = () => {
				if ( onReadyTimer ) { clearTimeout( onReadyTimer ) ; }
				notifications.removeListener( 'ready' , onReady ) ;
				this.push( callback ) ;
			} ;

			notifications.once( 'ready' , onReady ) ;
			notifications.once( 'purge' , onPurge ) ;

			return this ;
		}

		emitReady = true ;
	}

	sending = true ;

	if ( ! this.fireAndForget ) {
		liveNotifications.add( this ) ;
	}

	notificationsInterface.Notify(
		this.appName ,
		this.id ,
		this.icon ,
		this.summary ,
		this.body ,
		notifications.toPairs( this.actions ) ,
		notifications.toDict( this.hints ) ,
		this.timeout ,

		( error , id ) => {
			if ( destroyed ) { return ; }
			sending = false ;

			if ( error ) {
				//console.log( error ) ;
				if ( callback ) { callback( error ) ; }
				//this.emit( error ) ;
				if ( emitReady ) { notifications.emit( 'ready' ) ; }
				return ;
			}

			//console.log( "pushed ID:" , id ) ;
			this.id = id ;
			this.pushed = true ;

			if ( this.fireAndForget ) {
				this.cleaned = true ;
				this.closed = true ;	// Act as if it was already closed

				if ( ! liveNotifications.size ) {
					// If no more liveNotifications, just reset the whole thing, so it won't block script exit by keeping I/O listeners
					notifications.reset( callback ) ;
					return ;
				}

				if ( callback ) { callback() ; }
				return ;
			}

			notifications.on( 'close' , this.onClose ) ;

			// Default to 30 seconds low and normal priority or 10 minutes for critical priority
			var timeout = this.antiLeakTimeout || ( this.hints.urgency === 2 ? 600000 : 30000 ) ;

			this.timer = setTimeout( () => this.close( 'antiLeak' ) , timeout ) ;

			if ( callback ) { callback() ; }
			if ( emitReady ) { notifications.emit( 'ready' ) ; }
		}
	) ;

	return this ;
} ;



function onNotificationAction( id , action ) {
	if ( id !== this.id ) { return ; }

	notifications.removeListener( 'action' , this.onAction ) ;
	this.emit( 'action' , action ) ;
}



function onNotificationClose( id , closedBy ) {
	//console.log( "onNotificationClose" ) ;
	if ( id !== this.id || this.closed ) { return ; }
	this.closed = true ;

	//console.log( "onNotificationClose 2" ) ;
	notifications.removeListener( 'close' , this.onClose ) ;
	this.emit( 'close' , this.closedBy || closedBy ) ;
	this.cleanup() ;
}



function onNewListener( event ) {
	switch ( event ) {
		case 'action' :
			if ( this.listenerCount( 'action' ) === 0 ) {
				//console.log( "Adding a global Notifications listener for 'action'" ) ;
				notifications.on( 'action' , this.onAction ) ;
			}
			break ;

		/*
		case 'close' :
			if ( this.listenerCount( 'close' ) === 0 ) {
				//console.log( "Adding a global Notifications listener for 'close'" ) ;
				notifications.on( 'close' , this.onClose ) ;
			}
			break ;
		*/
	}
}



function onRemoveListener( event ) {
	switch ( event ) {
		case 'action' :
			if ( this.listenerCount( 'action' ) === 0 ) {
				//console.log( "Removing the global Notifications listener for 'action'" ) ;
				notifications.removeListener( 'action' , this.onAction ) ;
			}
			break ;

		/*
		case 'close' :
			if ( this.listenerCount( 'close' ) === 0 ) {
				//console.log( "Removing the global Notifications listener for 'close'" ) ;
				notifications.removeListener( 'close' , this.onClose ) ;
			}
			break ;
		*/
	}
}



Notification.prototype.close = function( closedBy ) {
	if ( this.closed ) { return this ; }
	if ( ! isInit ) { notifications.init( this.close.bind( this ) ) ; return this ; }

	if ( closedBy ) { this.closedBy = closedBy ; }

	notificationsInterface.CloseNotification( this.id , () => {

		// Most of time this code run AFTER the 'close' event listeners

		//console.log( "CloseNotification:" , arguments ) ;
		this.cleanup() ;
	} ) ;

	return this ;
} ;



Notification.prototype.cleanup = function() {
	if ( this.cleaned ) { return ; }
	this.cleaned = true ;

	//console.log( "Cleanup" ) ;

	if ( this.timer ) {
		//console.log( "Clear timer" ) ;
		clearTimeout( this.timer ) ;
		this.timer = null ;
	}

	if ( ! this.closed ) {
		this.emit( 'close' , this.closedBy || 'client' ) ;
		this.closed = true ;
	}

	this.removeAllListeners() ;
	liveNotifications.delete( this ) ;
} ;



Notification.prototype.destroy = function() {
	//console.log( "Destroy" ) ;

	if ( this.timer ) {
		//console.log( "Destroy timer" ) ;
		clearTimeout( this.timer ) ;
		this.timer = null ;
	}

	liveNotifications.delete( this ) ;
} ;





/* Helpers */



// Non-nested object/dict
notifications.toDict = function( object ) {
	var k , type , dict = [] ;

	for ( k in object ) {
		switch ( typeof object[ k ] ) {
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



notifications.toPairs = function( object ) {
	var k , pairs = [] ;

	for ( k in object ) {
		pairs.push( k ) ;
		pairs.push( object[ k ] ) ;
	}

	return pairs ;
} ;

