// Events Module
async function renderEventsPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">Events</h1>
                ${currentUser && currentUser.user_type === 'venue' ? `
                    <button onclick="showCreateEventModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Event
                    </button>
                ` : ''}
            </div>
            
            <div class="grid md:grid-cols-3 gap-6" id="eventsGrid">
                <div class="text-center py-8 col-span-full">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    loadEvents();
}

async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/events/list`);
        const data = await response.json();
        
        const container = document.getElementById('eventsGrid');
        if (data.events && data.events.length > 0) {
            container.innerHTML = data.events.map(event => `
                <div class="event-card cursor-pointer" onclick="viewEvent(${event.id})">
                    <img src="${event.event_image_url ? '/' + event.event_image_url : 'https://via.placeholder.com/400x200?text=Event'}" 
                         alt="${event.event_name}" 
                         class="event-image">
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-2">${event.event_name}</h3>
                        <p class="text-gray-600 text-sm mb-2 line-clamp-2">${event.event_description || ''}</p>
                        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(event.event_date).toLocaleDateString()}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-pink-500 font-bold text-xl">${formatCurrency(event.ticket_price)}</span>
                            <span class="text-gray-500 text-sm">${event.available_tickets} left</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full py-8">No events available</p>';
        }
    } catch (error) {
        console.error('Failed to load events:', error);
    }
}

async function viewEvent(eventId) {
    try {
        const headers = {};
        if (currentUser) headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
        
        const response = await fetch(`${API_BASE}/events/${eventId}`, { headers });
        const data = await response.json();
        
        if (data.event) showEventModal(data.event);
    } catch (error) {
        showNotification('Failed to load event', 'error');
    }
}

function showEventModal(event) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <img src="${event.event_image_url ? '/' + event.event_image_url : 'https://via.placeholder.com/800x400?text=Event'}" 
                 class="w-full h-64 object-cover">
            <div class="p-6">
                <h2 class="text-3xl font-bold mb-4">${event.event_name}</h2>
                <div class="space-y-3 mb-6">
                    <div class="flex items-center gap-3"><i class="fas fa-calendar text-pink-500"></i><span>${new Date(event.event_date).toLocaleString()}</span></div>
                    <div class="flex items-center gap-3"><i class="fas fa-map-marker-alt text-pink-500"></i><span>${event.event_location || 'TBA'}</span></div>
                    <div class="flex items-center gap-3"><i class="fas fa-ticket-alt text-pink-500"></i><span>${event.available_tickets} tickets</span></div>
                    <div class="flex items-center gap-3"><i class="fas fa-tag text-pink-500"></i><span class="text-2xl font-bold text-pink-500">${formatCurrency(event.ticket_price)}</span></div>
                </div>
                ${event.event_description ? `<p class="text-gray-700 mb-6">${event.event_description}</p>` : ''}
                <div class="flex gap-4">
                    ${currentUser && event.available_tickets > 0 ? `
                        <button onclick="purchaseTicket(${event.id})" class="btn-primary flex-1"><i class="fas fa-shopping-cart mr-2"></i>Purchase</button>
                    ` : !currentUser ? `
                        <button onclick="showAuthModal(); this.closest('.fixed').remove();" class="btn-primary flex-1">Sign In</button>
                    ` : `<button disabled class="btn-primary flex-1 opacity-50">Sold Out</button>`}
                    <button onclick="this.closest('.fixed').remove()" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function purchaseTicket(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/purchase`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showTicketModal(data.ticket);
            showNotification('Ticket purchased!', 'success');
        } else {
            showNotification(data.error || 'Purchase failed', 'error');
        }
    } catch (error) {
        showNotification('Purchase failed', 'error');
    }
}

function showTicketModal(ticket) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-md w-full p-8 text-center">
            <div class="text-6xl mb-4">🎫</div>
            <h2 class="text-2xl font-bold mb-4">Ticket Purchased!</h2>
            <div class="qr-container mb-6">
                <img src="/${ticket.qr_code_url}" alt="QR" class="mx-auto mb-4" style="width:200px;height:200px;">
                <p class="font-mono font-bold text-lg">${ticket.ticket_code}</p>
            </div>
            <p class="text-gray-600 mb-6">Show this QR code at the event entrance.</p>
            <button onclick="this.closest('.fixed').remove()" class="btn-primary w-full">Done</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function showCreateEventModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 class="text-2xl font-bold mb-6">Create Event</h2>
            <form onsubmit="submitEvent(event)" class="space-y-4">
                <input type="text" id="eventName" class="input-field" placeholder="Event Name" required>
                <textarea id="eventDescription" class="input-field" rows="3" placeholder="Description"></textarea>
                <div class="grid md:grid-cols-2 gap-4">
                    <input type="datetime-local" id="eventDate" class="input-field" required>
                    <input type="number" id="eventPrice" class="input-field" placeholder="Price" step="0.01" required>
                </div>
                <input type="text" id="eventLocation" class="input-field" placeholder="Location" required>
                <input type="number" id="eventTickets" class="input-field" placeholder="Total Tickets" required>
                <input type="file" id="eventImage" class="input-field" accept="image/*">
                <button type="submit" class="btn-primary w-full">Create Event</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitEvent(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('event_name', document.getElementById('eventName').value);
    formData.append('event_description', document.getElementById('eventDescription').value);
    formData.append('event_date', document.getElementById('eventDate').value);
    formData.append('ticket_price', document.getElementById('eventPrice').value);
    formData.append('event_location', document.getElementById('eventLocation').value);
    formData.append('total_tickets', document.getElementById('eventTickets').value);
    const image = document.getElementById('eventImage').files[0];
    if (image) formData.append('event_image', image);
    
    try {
        const response = await fetch(`${API_BASE}/events/create`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showNotification('Event created!', 'success');
            loadEvents();
        }
    } catch (error) {
        showNotification('Failed to create event', 'error');
    }
}
