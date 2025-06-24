# mDB - Your Personal Library

Ever wondered when you read *that* book?

## Features
- **Track Your Reading**: Keep a record of books you've read, are currently reading, or plan to read.
- **Organize Your Library**: Add books to your personal library with details like title, author, and genre.
- **User-Friendly Interface**: A simple and intuitive web interface to manage your library.

## Requirements
- A computer capable of running the application
- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [MariaDB](https://mariadb.org/) server (MySQL or compatible SQL servers may work with minor adjustments)
- Git (for cloning the repository)
- A modern web browser

## Installation

1. **Clone the repository:**
    ```sh
    git clone https://github.com/MaxixSVK/mDB
    ```
2. **Install dependencies:**
    ```sh
    npm install
    ```
3. **Set up the database:**
    - Import the `setup.sql` file into your MariaDB server.
4. **Configure environment variables:**
    - Copy `.env.example` to `.env` and update the values as needed.
5. **Update API endpoint:**
    - Edit `web/assets/js/api.js` to set your production API URL.
6. **Start the backend services:**
    ```sh
    npm run api
    ```
7. **Start the web server:**
    ```sh
    npm run web
    ```

## Security
For information on security practices, see the [Security Policy](SECURITY.md).

## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.