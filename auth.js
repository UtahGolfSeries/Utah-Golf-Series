import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 1. Initialize Supabase (Use your real URL and Anon Key here)
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

const loginForm = document.getElementById('login-form')
const messageBox = document.getElementById('message')

// 2. Handle the Submit Event
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault() // Prevents the page from refreshing
  
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  messageBox.innerText = "Checking credentials..."

  // 3. Call the Supabase Auth magic
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  })

  if (error) {
    messageBox.style.color = "red"
    messageBox.innerText = "Login Failed: " + error.message
  } else {
    messageBox.style.color = "green"
    messageBox.innerText = "Success! Redirecting..."
    
    // Send them to your main page after 1 second
    setTimeout(() => {
      window.location.href = '/index.html' 
    }, 1000)
  }
})