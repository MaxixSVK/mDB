# mDB - Your Personal Library

Ever wondered when you read *that* book?

## Features
- Custom Backend with SQL database
- Custom Frontend (Vanilla JS and Tailwind CSS)
- Custom CDN for images

## Requirements
- Node.js
- MariaDB server (other SQL servers like MySQL can be used with minor modifications)
- A computer to host the application

## Installation
1. Clone this repository:
    ```sh
    git clone https://github.com/MaxixSVK/mDB
    ```
2. Install npm packages:
    ```sh
    npm install
    ```
3. Setup Database with `setup.sql`
4. Set `.env` file (remove `.example` from the filename and fill it out).
5. Change `web/assets/js/api.js` to your prod url
6. Start the API and CDN:
    ```sh
    npm start
    ```

## Security
For information on security practices, see the [Security Policy](SECURITY.md).

## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.