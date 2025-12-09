# mDB - Your Personal Library

Ever wondered when you read *that* book?

## Requirements
- Git
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [MariaDB](https://mariadb.org/) server (MySQL or compatible SQL databases may work with minor modifications)

## Installation

1. **Clone the repository:**
    ```sh
    git clone https://github.com/MaxixSVK/mDB
    ```
2. **Install dependencies:**
    ```sh
    npm install
    ```
3. **Configure the database:**
    - Import the `setup.sql` file into your MariaDB server.
4. **Set environment variables:**
    - Copy `.env.example` to `.env` and update configuration values for your environment.
5. **Configure API endpoint:**
    - Update `web/assets/js/api.js` with your production API endpoint URL.
6. **Start services:**
    ```sh
    npm run env
    ```

## Security
For information on security practices and vulnerability reporting, see the [Security Policy](SECURITY.md).

## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.