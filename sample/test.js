#!/usr/bin/env node
/*
	Freedesktop.org Notifications

	Copyright (c) 2015 - 2021 Cédric Ronvel

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

const notifications = require( '..' ) ;


async function run() {
	var caps = await notifications.getCapabilities() ;
	console.log( "Capabilities:" , caps ) ;

	var info = await notifications.getServerInfo() ;
	console.log( "Server info:" , info ) ;

	var notif = new notifications.Notification( {
		summary: 'Hello world!' ,
		body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
		//urgency: 'critical' ,
		timeout: 0 ,
		appName: 'bill app' ,
		category: 'idk' ,
		icon: __dirname + '/log.png' ,
		//icon: 'appointment-new' ,
		//sound: __dirname + '/hiss.wav' ,
		//*
		actions: {
			default: '' ,
			ok: 'OK!' ,
			cancel: 'Cancel...',
			'inline-reply': 'Reply...'
		}
		//*/
	} ) ;

	notif.on( 'action' , action => {
		console.log( "Action '%s' triggered!" , action ) ;
	} ) ;

	notif.on( 'close' , closedBy => {
		console.log( "Closed by '%s'" , closedBy ) ;
	} ) ;

	notif.on( 'reply' , message => {
		console.log( "Reply got: '%s'" , message ) ;
	} ) ;

	await notif.push() ;
	console.log( "Pushed!" ) ;



	/*
	setTimeout( () => {
		notif.set( { summary: 'changed!!!' } ) ;
		notif.push() ;

		setTimeout( () => {
			notif.set( {
				summary: 'changed x2!!!' ,
				body: 'Oh noes!!!'
			} ) ;
			notif.push() ;

			setTimeout( () => {
				//notif.close() ;
				//process.exit() ;
				notifications.reset() ;
			} , 2000 ) ;
		} , 2000 ) ;
	} , 2000 ) ;
	//*/
}

run() ;

