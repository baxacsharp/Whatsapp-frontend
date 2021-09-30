import React, { Component } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { withRouter } from 'react-router-dom';

class Landing extends Component {
    handleClick = (e) =>
        e.target.name === 'login'
            ? this.props.history.push('/login')
            : this.props.history.push('/register');
    render() {
        return (
            <Container className=''>
                <Row className='justify-content-center align-items-center min-vh-100'>
                    <Col xs={6} className='text-center'>
                        <h1>Welcome to Fakedin</h1>
                        <div className='d-flex flex-column'>
                            <Button
                                variant='primary'
                                className='my-3'
                                name='login'
                                onClick={this.handleClick}
                            >
                                Login
                            </Button>
                            <Button variant='info' name='register' onClick={this.handleClick}>
                                Register
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }
}

export default withRouter(Landing);