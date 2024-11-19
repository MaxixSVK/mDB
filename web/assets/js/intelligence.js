    const api = 'https://apimdb.maxix.sk';
    
    document.addEventListener('DOMContentLoaded', function () {
        checkLogin();;
    });
    
    async function checkLogin() {
        const session = getCookie('sessionToken');
        if (session) {
            try {
                const response = await fetch(api + '/account/validate', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'authorization': session
                    },
                });
    
                if (response.ok) {
                    setupChat()
                } else {
                    handleLogout();
                    window.location.href = '/auth';
                }
            } catch (error) {
                console.error('Login failed:', error);
            }
        } else {
            window.location.href = '/auth';
        }
    }
    
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    function handleLogout() {
        fetch(api + '/account/logout', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
        }).then(() => {
            document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/auth';
        });
    }
    
    function setupChat() {
        document.getElementById('chat-form').addEventListener('submit', async function(event) {
            event.preventDefault();
            const messageInput = document.getElementById('message-input');
            const message = messageInput.value;
    
            const chatBox = document.getElementById('chat-box');
            const userMessageDiv = document.createElement('div');
            userMessageDiv.classList.add('text-white', 'mb-2', 'p-2', 'rounded-md', 'bg-[#2A2A2A]');
            userMessageDiv.innerText = message;
            chatBox.appendChild(userMessageDiv);
    
            const session = getCookie('sessionToken');
    
            messageInput.value = '';
    
            const response = await fetch(api + '/intelligence/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': session
                },
                body: JSON.stringify({ message })
            });
    
            const data = await response.json();
            const newMessageDiv = document.createElement('div');
            newMessageDiv.classList.add('text-white', 'mb-2', 'p-2', 'rounded-md', 'bg-[#1F1F1F]');
            newMessageDiv.innerHTML = data.response ? marked.parse(data.response.content) : `Error: ${data.error}`;
            chatBox.appendChild(newMessageDiv);
    
            const lists = newMessageDiv.querySelectorAll('ul, ol');
            lists.forEach(list => {
                list.classList.add('list-disc', 'list-inside', 'ml-4');
                const listItems = list.querySelectorAll('li');
                listItems.forEach(item => {
                    item.classList.add('mb-1');
                });
            });
    
            const images = newMessageDiv.querySelectorAll('img');
            images.forEach(img => {
                img.classList.add('w-32', 'h-auto', 'rounded-md', 'mt-2');
            });
    
            const codeBlocks = newMessageDiv.querySelectorAll('pre');
            codeBlocks.forEach(block => {
                block.classList.add('bg-[#333]', 'text-white', 'p-2', 'rounded-md', 'overflow-x-auto');
            });
    
            const links = newMessageDiv.querySelectorAll('a');
            links.forEach(link => {
                link.classList.add('text-blue-500', 'hover:underline');
            });
    
            chatBox.scrollTop = chatBox.scrollHeight;
        });
    }